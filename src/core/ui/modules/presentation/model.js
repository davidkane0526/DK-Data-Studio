'use strict';

const VERSION='1.0.0';
const SCHEMA='dkds.presentation-model.v1';
const ROLES=Object.freeze({
  SCIENTIFIC_PRIMARY:'scientific-primary',
  DATA_CONTROL:'data-control',
  INSPECTOR:'inspector',
  SCIENTIFIC_SECONDARY:'scientific-secondary'
});
const ROLE_SET=new Set(Object.values(ROLES));
const text=value=>String(value??'');
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

function normalizeRole(kind,row={}){
  const explicit=text(row.presentationRole||row.semanticRole||'').trim().toLowerCase();
  if(ROLE_SET.has(explicit))return explicit;
  if(['analysis-primary','primary'].includes(explicit))return ROLES.SCIENTIFIC_PRIMARY;
  if(['control','controls','panel'].includes(explicit))return ROLES.DATA_CONTROL;
  if(['secondary','analysis-secondary'].includes(explicit))return ROLES.SCIENTIFIC_SECONDARY;
  const semantic=text(row.semanticKind).trim().toLowerCase();
  if(semantic==='inspector')return ROLES.INSPECTOR;
  if(['control','controls','panel'].includes(semantic))return ROLES.DATA_CONTROL;
  if(kind==='primary')return ROLES.SCIENTIFIC_PRIMARY;
  if(kind==='sub')return ROLES.SCIENTIFIC_SECONDARY;
  return ROLES.DATA_CONTROL;
}
function surfaceDefaults(kind,row={}){
  const role=normalizeRole(kind,row);
  const priority=number(row.priority,kind==='primary'?100:role===ROLES.INSPECTOR?80:kind==='prime'?70:50);
  return {role,priority,collapsible:row.collapsible!==undefined?!!row.collapsible:kind!=='primary'};
}
function contractSurface(row={},kind='prime'){
  const id=text(row.id).trim();if(!id)return null;
  const defaults=surfaceDefaults(kind,row);
  return Object.freeze({
    id:`workspace-${kind}:${id}`,surfaceId:id,kind,
    label:text(row.label||row.title||id),semanticKind:text(row.semanticKind),
    ...defaults,active:false,
    placement:text(row.defaultPlacement||row.placement||(kind==='primary'?'main':'')),
    placements:Object.freeze([...(Array.isArray(row.placements)?row.placements:[])]),
    source:'core-registry'
  });
}
function runtimeSurface(row={}){
  const id=text(row.id).trim();if(!id)return null;
  const kind=text(row.kind||row.surfaceKind||(id.includes('workspace-primary:')?'primary':id.includes('workspace-sub:')?'sub':'prime'));
  const defaults=surfaceDefaults(kind,row);
  return Object.freeze({
    id,surfaceId:text(row.surfaceId||id.split(':').slice(1).join(':')),kind,
    label:text(row.label||row.title||row.surfaceId||id),semanticKind:text(row.semanticKind),
    ...defaults,role:normalizeRole(kind,row),active:!!row.active,
    placement:text(row.placement||row.defaultPlacement||(kind==='primary'?'main':'')),
    placements:Object.freeze([...(Array.isArray(row.placements)?row.placements:[])]),
    source:'core-runtime'
  });
}
function statusRows(){
  const rows=window.DKDSPlugins?.statusBar?.list?.()||[];
  return rows.filter(row=>!row?.value?.hidden).map(row=>{
    const value=row?.value||{};
    return Object.freeze({pluginId:text(row?.pluginId),id:text(row?.id),side:text(value.side)==='left'?'left':'right',label:text(value.label),icon:text(value.icon),state:text(value.state),disabled:!!value.disabled,clickable:typeof value.onClick==='function',title:text(value.title)});
  }).filter(row=>row.pluginId&&row.id&&row.id!=='lan-web');
}
function actionRows(activityId){
  return (window.DKDSUI?.actions?.list?.(activityId)||[]).map(row=>Object.freeze({
    id:text(row.id),label:text(row.label),icon:text(row.icon),enabled:row.enabled!==false,active:!!row.active,menu:!!row.menu,
    items:Object.freeze((row.items||[]).map(item=>Object.freeze({id:text(item.id),label:text(item.label),icon:text(item.icon),enabled:item.enabled!==false})))
  }));
}

class PresentationModel {
  constructor(){this.configured={};this.revision=0;this.statusMessage='';}
  configure(next={}){this.configured={...this.configured,...next};this.touch();return this;}
  touch(){this.revision++;return this.revision;}
  setStatus(message){this.statusMessage=text(message).trim();this.touch();return this.statusMessage;}
  project(){
    const raw=typeof this.configured.projectSnapshot==='function'?this.configured.projectSnapshot()||{}:{};
    const items=(raw.projects||raw.items||[]).map(row=>Object.freeze({id:text(row.id),title:text(row.title||'未命名项目'),active:!!row.active,dirty:!!row.dirty})).filter(row=>row.id);
    const activeId=text(raw.activeProjectId||items.find(row=>row.active)?.id);
    return Object.freeze({ready:raw.ready!==undefined?!!raw.ready:!!activeId,activeId,title:text(raw.title||items.find(row=>row.id===activeId)?.title||'DK Data Studio'),items:Object.freeze(items)});
  }
  contracts(){return window.DKDSPlugins?.workspace?.top?.()||[];}
  contractFor(activity={}){return this.contracts().find(row=>text(row?.activity)===text(activity.id)||text(row?.pluginId)===text(activity.pluginId))||null;}
  surfaces(activity,contract){
    const live=(window.DKDSUI?.workspaces?.actions?.(text(activity?.id))||[]).map(runtimeSurface).filter(Boolean);
    if(live.length)return Object.freeze(live);
    if(!contract)return Object.freeze([]);
    const primary=contractSurface(contract.layout?.primary||{id:'main',label:'主界面'},'primary');
    const primes=(contract.layout?.prime||[]).map(row=>contractSurface(row,'prime')).filter(Boolean);
    const subs=(contract.layout?.sub||[]).map(row=>contractSurface(row,'sub')).filter(Boolean);
    return Object.freeze([primary,...primes,...subs].filter(Boolean));
  }
  workspaces(){
    return Object.freeze((window.DKDSPlugins?.activities?.list?.()||[]).filter(row=>row?.id&&(this.contractFor(row)||text(row.navigation)==='system')).map(row=>{
      const contract=this.contractFor(row),system=text(row.navigation)==='system';
      const surfaces=this.surfaces(row,contract);
      const primary=surfaces.find(surface=>surface.kind==='primary')||contractSurface({id:'main',label:row.label||row.name||'系统工具'},'primary');
      return Object.freeze({
        id:text(row.id),activityId:text(row.id),pluginId:text(row.pluginId),label:text(row.label||row.name||row.id),icon:text(row.icon||contract?.icon),
        role:contract?'top':'system',system,isSuper:!!row.isSuper,
        primary,primes:Object.freeze(surfaces.filter(surface=>surface.kind==='prime')),subs:Object.freeze(surfaces.filter(surface=>surface.kind==='sub')),
        surfaces,actions:Object.freeze(actionRows(text(row.id)))
      });
    }));
  }
  theme(){
    return Object.freeze({
      id:window.DKDSTheme?.current?.()||'light',tokens:window.DKDSTheme?.tokens?.()||{},contractVersion:window.DKDSTheme?.contractVersion||window.DKDSTheme?.version||'',
      material:window.DKDSTheme?.materials?.('native')||{base:{},roles:{}},appearance:window.DKDSTheme?.appearanceRoles?.()||{roles:{},components:{}},
      components:window.DKDSTheme?.appearanceComponents?.()||{},consumption:window.DKDSTheme?.consumption?.()||{version:'0.0.0',components:{}},
      scientific:window.DKDSTheme?.scientific?.()||{seriesPalette:[],mode:'fallback-only',precedence:[]}
    });
  }
  snapshot(context={}){
    const project=this.project(),workspaces=this.workspaces(),activityId=text(window.DKDSPlugins?.activities?.active?.()),activity=workspaces.find(row=>row.activityId===activityId)||null;
    const route=context.route||{kind:activity?.system?'system':'workspace',activityId,pluginId:text(activity?.pluginId)};
    const history=typeof this.configured.historySnapshot==='function'?this.configured.historySnapshot():{canUndo:false,canRedo:false,past:[],future:[]};
    return Object.freeze({
      schema:SCHEMA,version:VERSION,revision:++this.revision,project,activity:Object.freeze({id:activityId,label:text(activity?.label),pluginId:text(activity?.pluginId)}),
      route:Object.freeze({...route}),workspaces,status:Object.freeze({message:this.statusMessage,items:Object.freeze(statusRows())}),history:Object.freeze({...history}),theme:this.theme()
    });
  }
}

const model=new PresentationModel();
const api=Object.freeze({version:VERSION,schema:SCHEMA,roles:ROLES,PresentationModel,model,normalizeRole});
module.exports=api;
