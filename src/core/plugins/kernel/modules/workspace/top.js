'use strict';
const {state, definitions, active}=require('../context');
const {isDefinitionEnabled, definitionById, workspaceMeta, isTopDefinition, isSuperEligibleDefinition, readSuperPreference, writeSuperPreference, topWorkspaceForPlugin, topActivityIdForPlugin, superState}=require('../bootstrap');
const {eventEmit}=require('../events/history');
const {renderActivityBar, refreshActivityVisibility, setActiveActivity}=require('../activity/shell');
const {registerTypedContribution, listContributions}=require('../contributions/typed');
const {listPluginStates}=require('../lifecycle');
const {isPresentationRole,isPresentationPurpose}=require('../../../../contracts/presentation');
const {pluginHostView}=require('../host-facade');
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
      const presentationPurpose=String(row.presentationPurpose||'').trim().toLowerCase();
      if(presentationPurpose&&!isPresentationPurpose(presentationPurpose))throw new Error(`TOP workspace ${pluginId} ${kind}/${id} declares unknown presentationPurpose: ${presentationPurpose}.`);
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
    // Activity registration can precede the TOP presentation contract. Re-render
    // only after the contract exists so PresentationModel does not permanently
    // filter a valid TOP from navigation until some unrelated plugin changes.
    renderActivityBar();
    eventEmit('workspace:top-registered',{pluginId,activity:value.activity,id:value.id});
    return value;
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
    if(ok)eventEmit('super:changed',superState());
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
  function defaultSuperCandidate() {
    // The declared default is an identity choice, not a readiness filter. If it
    // is broken, initialization must keep it selected and show the neutral host
    // rather than silently substituting another TOP.
    const rows=[...definitions.values()]
      .filter(definition=>isSuperEligibleDefinition(definition)&&isDefinitionEnabled(definition))
      .sort((a,b)=>Number(b.manifest?.workspace?.defaultSuper===true)-Number(a.manifest?.workspace?.defaultSuper===true)
        ||(Number(a.manifest?.order)||100)-(Number(b.manifest?.order)||100)
        ||String(a.manifest.id).localeCompare(String(b.manifest.id)));
    return rows.find(definition=>definition.manifest?.workspace?.defaultSuper===true)?.manifest?.id
      ||rows.find(definition=>topDefinitionReady(definition.manifest.id))?.manifest?.id
      ||rows[0]?.manifest?.id||null;
  }
  async function initializeSuperSelection({persistFallback=true,preferredId=''}={}) {
    if(state.host?.isAuxiliaryWindow)return false;
    const saved=readSuperPreference();
    const selected=String(saved||preferredId||defaultSuperCandidate()||'').trim();
    state.superPluginId=selected||null;
    // First run may persist the manifest-declared default even when that plugin
    // is temporarily broken. This guarantees the next launch retries the same
    // explicit SUPER instead of turning another TOP into a session fallback.
    if(!saved&&selected&&persistFallback)writeSuperPreference(selected);
    return activateSuperWorkspace({invoke:true});
  }
module.exports=Object.freeze({validateTopWorkspaceSpec, registerTopWorkspace, topDefinitionReady, activateSuperWorkspace, setSuperPlugin, initializeSuperSelection});
