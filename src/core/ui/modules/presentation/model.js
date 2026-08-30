'use strict';

const VERSION='1.2.0';
const SCHEMA='dkds.presentation-model.v1';
const {ROLES,isPresentationRole}=require('../../../contracts/presentation');
const text=value=>String(value??'');
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

function normalizeRole(kind,row={}){
  const explicit=text(row.presentationRole||row.semanticRole||row.role||'').trim().toLowerCase();
  if(isPresentationRole(explicit))return explicit;
  if(['analysis-primary','primary'].includes(explicit))return ROLES.SCIENTIFIC_PRIMARY;
  if(['data-main','data-workspace'].includes(explicit))return ROLES.DATA_PRIMARY;
  if(['utility-main','tool-primary'].includes(explicit))return ROLES.UTILITY_PRIMARY;
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
function hasDeclaredPresentationRole(row={}){return isPresentationRole(row.presentationRole||row.semanticRole);}
function contractSurface(row={},kind='prime'){
  const id=text(row.id).trim();if(!id)return null;
  const defaults=surfaceDefaults(kind,row);
  return Object.freeze({
    id:`workspace-${kind}:${id}`,surfaceId:id,kind,
    label:text(row.label||row.title||id),semanticKind:text(row.semanticKind),
    ...defaults,active:false,
    presentationDeclared:hasDeclaredPresentationRole(row),source:'core-registry'
  });
}
function runtimeSurface(row={},fallback=null){
  const merged=fallback?{...fallback,...row}:{...row};
  const id=text(row.id||fallback?.id).trim();if(!id)return null;
  const kind=text(row.kind||row.surfaceKind||fallback?.kind||(id.includes('workspace-primary:')?'primary':id.includes('workspace-sub:')?'sub':'prime'));
  const roleDeclared=text(row.presentationRole||row.semanticRole||row.role||row.semanticKind).trim();
  const defaults=surfaceDefaults(kind,roleDeclared?row:(fallback||row));
  return Object.freeze({
    id,surfaceId:text(row.surfaceId||fallback?.surfaceId||id.split(':').slice(1).join(':')),kind,
    label:text(row.label||row.title||fallback?.label||row.surfaceId||id),semanticKind:text(row.semanticKind||fallback?.semanticKind),
    ...defaults,role:roleDeclared?normalizeRole(kind,row):text(fallback?.role||defaults.role),active:!!row.active,
    presentationDeclared:hasDeclaredPresentationRole(row)||!!fallback?.presentationDeclared,source:fallback?'core-runtime+contract':'core-runtime'
  });
}
function statusRows(){
  const rows=window.DKDSPlugins?.statusBar?.list?.()||[];
  return rows.filter(row=>!row?.value?.hidden).map(row=>{
    const value=row?.value||{};
    return Object.freeze({pluginId:text(row?.pluginId),id:text(row?.id),side:text(value.side)==='left'?'left':'right',order:number(value.order,100),label:text(value.label),icon:text(value.icon),state:text(value.state),className:text(value.className),colorPolicy:text(value.colorPolicy||'theme'),disabled:!!value.disabled,clickable:typeof value.onClick==='function',title:text(value.title)});
  }).filter(row=>row.pluginId&&row.id&&row.id!=='lan-web').sort((a,b)=>a.side.localeCompare(b.side)||a.order-b.order||a.id.localeCompare(b.id));
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
    const declared=[];
    if(contract){
      const primary=contractSurface(contract.layout?.primary||{id:'main',label:'主界面'},'primary');
      if(primary)declared.push(primary);
      declared.push(...(contract.layout?.prime||[]).map(row=>contractSurface(row,'prime')).filter(Boolean));
      declared.push(...(contract.layout?.sub||[]).map(row=>contractSurface(row,'sub')).filter(Boolean));
    }
    const byKey=new Map(declared.map(row=>[`${row.kind}:${row.surfaceId}`,row]));
    const live=(window.DKDSUI?.workspaces?.actions?.(text(activity?.id))||[]).map(row=>{
      const surfaceId=text(row.surfaceId||text(row.id).split(':').slice(1).join(':'));
      const kind=text(row.kind||row.surfaceKind||(text(row.id).includes('workspace-primary:')?'primary':text(row.id).includes('workspace-sub:')?'sub':'prime'));
      return runtimeSurface(row,byKey.get(`${kind}:${surfaceId}`)||null);
    }).filter(Boolean);
    if(!live.length)return Object.freeze(declared);
    const liveKeys=new Set(live.map(row=>`${row.kind}:${row.surfaceId}`));
    return Object.freeze([...live,...declared.filter(row=>!liveKeys.has(`${row.kind}:${row.surfaceId}`))]);
  }
  workspaces(){
    return Object.freeze((window.DKDSPlugins?.activities?.list?.()||[]).filter(row=>row?.id&&(this.contractFor(row)||text(row.navigation)==='system')).map(row=>{
      const contract=this.contractFor(row),system=text(row.navigation)==='system';
      const surfaces=this.surfaces(row,contract);
      const primary=surfaces.find(surface=>surface.kind==='primary')||contractSurface({id:'main',label:row.label||row.name||'系统工具'},'primary');
      const presentationIssues=[];
      if(!system){
        if(!contract)presentationIssues.push('missing-top-workspace-contract');
        if(!surfaces.length)presentationIssues.push('missing-surfaces');
        for(const surface of surfaces){
          if(surface.presentationDeclared!==true)presentationIssues.push(`undeclared-role:${surface.kind}:${surface.surfaceId}`);
        }
      }
      const presentationComplete=!!contract&&surfaces.length>0&&presentationIssues.length===0;
      return Object.freeze({
        id:text(row.id),activityId:text(row.id),pluginId:text(row.pluginId),label:text(row.label||row.name||row.id),contextLabel:text(row.contextLabel||row.label||row.name||row.id),icon:text(row.icon||contract?.icon),description:text(row.description),
        order:number(row.order,100),primaryNavigation:row.primary===true,default:row.default===true,navigation:text(row.navigation),openMode:text(row.openMode),pluginType:text(row.pluginType),
        role:contract?'top':'system',system,isSuper:!!row.isSuper,presentationComplete,presentationIssues:Object.freeze(presentationIssues),
        primary,primes:Object.freeze(surfaces.filter(surface=>surface.kind==='prime')),subs:Object.freeze(surfaces.filter(surface=>surface.kind==='sub')),
        surfaces,actions:Object.freeze(actionRows(text(row.id)))
      });
    }));
  }

  presentationAudit(){
    const rows=this.workspaces().filter(row=>!row.system);
    const items=rows.map(row=>Object.freeze({activityId:row.activityId,pluginId:row.pluginId,label:row.label,complete:row.presentationComplete===true,issues:Object.freeze([...(row.presentationIssues||[])])}));
    const incomplete=items.filter(row=>!row.complete);
    return Object.freeze({total:items.length,complete:items.length-incomplete.length,incomplete:incomplete.length,items:Object.freeze(items),invalid:Object.freeze(incomplete)});
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
