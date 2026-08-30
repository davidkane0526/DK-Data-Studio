'use strict';
const {state, definitions, active}=require('../context');
const {isDefinitionEnabled, definitionById, workspaceMeta, isTopDefinition, isSuperEligibleDefinition, readSuperPreference, writeSuperPreference, readPrimePlacements, writePrimePlacements, primePlacementKey, topWorkspaceForPlugin, topActivityIdForPlugin, superState}=require('../bootstrap');
const {eventEmit}=require('../events/history');
const {renderActivityBar, refreshActivityVisibility, setActiveActivity}=require('../activity/shell');
const {registerTypedContribution, listContributions}=require('../contributions/typed');
const {listPluginStates}=require('../lifecycle');
const {isPresentationRole}=require('../../../../contracts/presentation');
  function validateTopWorkspaceSpec(pluginId,spec={}) {
    const definition=definitionById(pluginId);
    if(!definition||!isTopDefinition(definition))throw new Error(`Plugin ${pluginId} must declare workspace.role=top before registering a TOP workspace.`);
    const activity=String(spec.activity||workspaceMeta(definition.manifest).activity||'').trim();
    if(!activity)throw new Error(`TOP workspace ${pluginId} must declare an activity.`);
    const layout=spec.layout&&typeof spec.layout==='object'?spec.layout:{};
    const mode=String(layout.mode||'').trim().toLowerCase();
    if(mode!=='native')throw new Error(`TOP workspace ${pluginId} must use the native PluginWorkspace layout contract.`);
    const root=layout.root&&typeof layout.root==='object'?layout.root:{};
    const rootSelector=String(root.selector||'').trim();
    if(!rootSelector)throw new Error(`TOP workspace ${pluginId} must declare layout.root.selector.`);
    const surfaceRows=[['primary',layout.primary],...(Array.isArray(layout.prime)?layout.prime.map(row=>['prime',row]):[]),...(Array.isArray(layout.sub)?layout.sub.map(row=>['sub',row]):[])];
    for(const [kind,row] of surfaceRows){
      if(!row||typeof row!=='object')throw new Error(`TOP workspace ${pluginId} must declare layout.${kind}.`);
      const id=String(row.id||'').trim(),presentationRole=String(row.presentationRole||'').trim().toLowerCase();
      if(!id)throw new Error(`TOP workspace ${pluginId} ${kind} surface must declare id.`);
      if(!isPresentationRole(presentationRole))throw new Error(`TOP workspace ${pluginId} ${kind}/${id} must declare a valid presentationRole for Plugin API 1.19.`);
      if(['placement','placements','defaultPlacement'].some(key=>Object.prototype.hasOwnProperty.call(row,key)))throw new Error(`TOP workspace ${pluginId} ${kind}/${id} must not declare Desktop placement in the platform-neutral Presentation contract.`);
    }
    return Object.freeze({
      id:String(spec.id||activity),
      activity,
      label:String(spec.label||definition.manifest.name||activity),
      icon:String(spec.icon||workspaceMeta(definition.manifest).icon||''),
      layout:Object.freeze({
        mode:'native',
        root:Object.freeze({...root,selector:rootSelector}),
        primary:Object.freeze(layout.primary&&typeof layout.primary==='object'?{...layout.primary}:{}),
        prime:Object.freeze(Array.isArray(layout.prime)?layout.prime.map(row=>Object.freeze({...row})):[]),
        sub:Object.freeze(Array.isArray(layout.sub)?layout.sub.map(row=>Object.freeze({...row})):[])
      }),
      pluginId
    });
  }
  function registerTopWorkspace(pluginId,spec={}) {
    if(topWorkspaceForPlugin(pluginId))throw new Error(`Plugin ${pluginId} already registered a TOP workspace.`);
    const value=validateTopWorkspaceSpec(pluginId,spec);
    registerTypedContribution(pluginId,'ui.topWorkspaces',value.id,value);
    return value;
  }
  function registerPrimeContribution(pluginId,id,spec={}) {
    const activity=String(spec.activity||topActivityIdForPlugin(pluginId)||'').trim();
    const placements=(Array.isArray(spec.placements)&&spec.placements.length?spec.placements:['float','right','bottom']).map(x=>String(x).trim().toLowerCase());
    const allowed=new Set(['float','right','bottom']);
    if(!placements.every(x=>allowed.has(x)))throw new Error(`Invalid PRIME placement for ${pluginId}/${id}.`);
    const unique=[...new Set(placements)];
    const requestedDefault=String(spec.defaultPlacement||unique[0]||'float').trim().toLowerCase();
    const defaultPlacement=unique.includes(requestedDefault)?requestedDefault:unique[0];
    const value=Object.freeze({
      ...spec,id,activity,pluginId,
      target:String(spec.target||'').trim(),
      portable:spec.portable===true,
      persistPlacement:spec.persistPlacement!==false,
      defaultPlacement,
      placements:Object.freeze(unique)
    });
    registerTypedContribution(pluginId,'ui.prime',id,value);
    return value;
  }
  function primeContribution(pluginId,id) {
    return listContributions('ui.prime').find(row=>row.pluginId===pluginId&&row.id===id)?.value||null;
  }
  function primeRowsForPlugin(pluginId) {
    return listContributions('ui.prime').filter(row=>row.pluginId===pluginId);
  }
  function primePlacementFor(pluginId,id) {
    const value=primeContribution(pluginId,id);
    if(!value)return '';
    const saved=value.persistPlacement?String(readPrimePlacements()[primePlacementKey(pluginId,id)]||'').trim().toLowerCase():'';
    if(saved&&value.placements.includes(saved))return saved;
    if(typeof value.getPlacement==='function'){
      try {
        const live=String(value.getPlacement()||'').trim().toLowerCase();
        if(value.placements.includes(live))return live;
      } catch(err){ console.warn(`[DKDS PRIME placement:${pluginId}/${id}]`,err); }
    }
    return value.defaultPlacement||value.placements[0]||'float';
  }
  async function placePrimeContribution(pluginId,id,placement,{persist=true,reason='user'}={}) {
    const value=primeContribution(pluginId,id);
    if(!value)throw new Error(`PRIME contribution not found: ${pluginId}/${id}`);
    const next=String(placement||'').trim().toLowerCase();
    if(!value.placements.includes(next))throw new Error(`PRIME ${pluginId}/${id} does not allow placement: ${next}`);
    if(!state.host?.isAuxiliaryWindow&&state.superPluginId&&state.superPluginId!==pluginId){
      throw new Error(`只有当前 SUPER 的 PRIME 可以放置到主界面：${pluginId}/${id}`);
    }
    let result;
    if(typeof value.place==='function')result=await value.place(next,{pluginId,id,reason,host:state.host});
    else if(typeof state.host?.placePrime==='function')result=await state.host.placePrime(value,next,{pluginId,id,reason});
    else throw new Error(`PRIME ${pluginId}/${id} 未提供 placement adapter，也没有可用的宿主 placement manager。`);
    if(result===false)throw new Error(`PRIME ${pluginId}/${id} placement adapter rejected: ${next}`);
    if(persist&&value.persistPlacement){
      readPrimePlacements()[primePlacementKey(pluginId,id)]=next;
      writePrimePlacements();
    }
    eventEmit('prime:placement-changed',{pluginId,id,placement:next,reason});
    return next;
  }
  async function applySuperPrimePlacements() {
    if(!state.superPluginId)return;
    for(const row of primeRowsForPlugin(state.superPluginId)){
      const placement=primePlacementFor(row.pluginId,row.id);
      if(!placement)continue;
      try { await placePrimeContribution(row.pluginId,row.id,placement,{persist:false,reason:'super-activate'}); }
      catch(err){ console.warn(`[DKDS PRIME apply:${row.pluginId}/${row.id}]`,err); }
    }
  }
  function registerSubContribution(pluginId,id,spec={}) {
    const activity=String(spec.activity||topActivityIdForPlugin(pluginId)||'').trim();
    return registerTypedContribution(pluginId,'ui.sub',id,Object.freeze({id,activity,...spec,pluginId}));
  }
  function topDefinitionReady(pluginId) {
    const definition=definitionById(pluginId);
    return !!(definition&&isDefinitionEnabled(definition)&&active.has(pluginId)&&topWorkspaceForPlugin(pluginId)&&topActivityIdForPlugin(pluginId));
  }
  async function activateSuperWorkspace({invoke=true}={}) {
    const current=superState();
    if(!current.available){
      state.activeActivityId=null;
      renderActivityBar();
      refreshActivityVisibility();
      state.host?.showNoSuperWorkspace?.(current);
      eventEmit('super:changed',current);
      return false;
    }
    state.host?.applySuperWorkspace?.(current);
    const ok=await setActiveActivity(current.activityId,{invoke,forceEmbedded:true});
    if(ok){
      await applySuperPrimePlacements();
      eventEmit('super:changed',superState());
    }
    return ok;
  }
  async function setSuperPlugin(pluginId,{persist=true,invoke=true}={}) {
    const id=String(pluginId||'').trim();
    if(!id)throw new Error('必须选择一个 TOP 插件作为主界面。');
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    if(!isTopDefinition(definition))throw new Error(`插件 ${definition.manifest.name||id} 不是 TOP 插件。`);
    if(!isSuperEligibleDefinition(definition))throw new Error(`插件 ${definition.manifest.name||id} 属于系统功能，不能设为 SUPER。`);
    if(!isDefinitionEnabled(definition)||!active.has(id))throw new Error(`请先启用插件 ${definition.manifest.name||id}。`);
    if(!topWorkspaceForPlugin(id))throw new Error(`插件 ${definition.manifest.name||id} 未注册完整 TOP 工作区契约。`);
    const previous=state.superPluginId;
    if(previous===id)return superState();
    const activityId=topActivityIdForPlugin(id);
    // Host-role changes are transactional. Before a TOP becomes embedded as
    // SUPER, the state.host must flush and retire any dedicated renderer of that
    // same plugin so two live instances can never own the same project state.
    await state.host?.prepareSuperTransition?.({previous,pluginId:id,activityId});
    state.superPluginId=id;
    try{
      const activated=await activateSuperWorkspace({invoke});
      if(!activated)throw new Error(`插件 ${definition.manifest.name||id} 的 SUPER 工作区启动失败。`);
      if(persist)writeSuperPreference(id);
      renderActivityBar();
      eventEmit('super:selection-changed',{previous,pluginId:id,state:superState()});
      eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      return superState();
    }catch(err){
      state.superPluginId=previous;
      if(previous&&topDefinitionReady(previous)){
        try{await activateSuperWorkspace({invoke:true});}catch(rollbackErr){console.error('[DKDS SUPER rollback]',rollbackErr);}
      }else{
        state.activeActivityId=null;
        renderActivityBar();
        refreshActivityVisibility();
        state.host?.showNoSuperWorkspace?.(superState());
      }
      throw err;
    }
  }
  async function initializeSuperSelection() {
    if(state.host?.isAuxiliaryWindow)return false;
    const saved=readSuperPreference();
    if(saved!==undefined){
      state.superPluginId=saved&&topDefinitionReady(saved)?saved:null;
      return activateSuperWorkspace({invoke:true});
    }
    // First-run initialization is domain-neutral: a TOP may request the initial
    // SUPER role through manifest.workspace.defaultSuper; otherwise manifest
    // order decides the initial workspace. Persisted user selection always wins.
    const candidates=[...definitions.values()]
      .filter(definition=>isSuperEligibleDefinition(definition)&&topDefinitionReady(definition.manifest.id))
      .sort((a,b)=>Number(b.manifest?.workspace?.defaultSuper===true)-Number(a.manifest?.workspace?.defaultSuper===true)
        ||(Number(a.manifest?.order)||100)-(Number(b.manifest?.order)||100)
        ||String(a.manifest.id).localeCompare(String(b.manifest.id)));
    const initial=candidates[0]?.manifest?.id||null;
    if(initial){
      state.superPluginId=initial;
      writeSuperPreference(initial);
    }else state.superPluginId=null;
    return activateSuperWorkspace({invoke:true});
  }
module.exports=Object.freeze({validateTopWorkspaceSpec, registerTopWorkspace, registerPrimeContribution, primeContribution, primeRowsForPlugin, primePlacementFor, placePrimeContribution, applySuperPrimePlacements, registerSubContribution, topDefinitionReady, activateSuperWorkspace, setSuperPlugin, initializeSuperSelection});
