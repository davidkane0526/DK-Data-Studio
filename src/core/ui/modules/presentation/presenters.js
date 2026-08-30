'use strict';
const {model,roles}=require('./model');

const text=value=>String(value??'');

function desktopNavigationItem(workspace,slot,activeId,context={}){
  const auxiliary=!!context.isAuxiliaryWindow;
  const opensWindow=!auxiliary&&!workspace.isSuper&&(workspace.role==='top'||workspace.openMode==='window');
  return Object.freeze({
    id:workspace.activityId,activityId:workspace.activityId,pluginId:workspace.pluginId,label:workspace.label,contextLabel:workspace.contextLabel,icon:workspace.icon,
    description:workspace.description,order:workspace.order,slot,active:workspace.activityId===activeId,isSuper:workspace.isSuper,workspaceRole:workspace.role,pluginType:workspace.pluginType,
    activation:opensWindow?'window':'embedded'
  });
}
function desktopNavigation(workspaces,activeId,context={}){
  const auxiliary=!!context.isAuxiliaryWindow,primary=[],secondary=[],tools=[],system=[];
  for(const workspace of workspaces){
    if(workspace.system||workspace.navigation==='system'){system.push(desktopNavigationItem(workspace,'system',activeId,context));continue;}
    if(workspace.navigation==='hidden')continue;
    const isTool=!auxiliary&&workspace.pluginType==='tool'&&workspace.role==='top'&&!workspace.isSuper;
    if(isTool){tools.push(desktopNavigationItem(workspace,'tools',activeId,context));continue;}
    const slot=workspace.primaryNavigation?'primary':'secondary';
    (slot==='primary'?primary:secondary).push(desktopNavigationItem(workspace,slot,activeId,context));
  }
  const order=(a,b)=>a.order-b.order||a.label.localeCompare(b.label)||a.activityId.localeCompare(b.activityId);
  primary.sort(order);secondary.sort(order);tools.sort(order);system.sort(order);
  return Object.freeze({primary:Object.freeze(primary),secondary:Object.freeze(secondary),tools:Object.freeze(tools),system:Object.freeze(system)});
}

function desktopSurfaceItem(surface){
  const kind=text(surface?.kind),role=text(surface?.role),priority=Number.isFinite(Number(surface?.priority))?Number(surface.priority):0;
  const section=kind==='prime'?'PRIME':kind==='sub'?'SUB':'PRIMARY';
  return Object.freeze({...surface,id:text(surface?.surfaceId||surface?.id),surfaceId:text(surface?.surfaceId||surface?.id),kind,role,priority,section,presentation:Object.freeze({region:'workspace-toolbar',navigation:kind==='primary'?'primary':'context'})});
}
function desktopWorkspaceSurfaces(workspace){
  if(!workspace)return Object.freeze([]);
  const rows=(workspace.surfaces||[]).filter(surface=>text(surface?.kind)!=='primary').map(desktopSurfaceItem);
  rows.sort((a,b)=>b.priority-a.priority||String(a.section).localeCompare(String(b.section))||String(a.label).localeCompare(String(b.label))||a.surfaceId.localeCompare(b.surfaceId));
  return Object.freeze(rows);
}

class DesktopPresenter {
  constructor(source=model){this.model=source;}
  present(context={}){
    const snapshot=this.model.snapshot(context);
    const navigation=desktopNavigation(snapshot.workspaces,snapshot.activity.id,context),active=snapshot.workspaces.find(row=>row.activityId===snapshot.activity.id)||null;
    return Object.freeze({...snapshot,schema:'dkds.desktop-presentation.v1',presentationModel:snapshot.schema,platform:'desktop',navigation,workspaceSurfaces:desktopWorkspaceSurfaces(active)});
  }
}

function mobilePlacement(surface,orientation='portrait'){
  const role=text(surface?.role);
  if([roles.SCIENTIFIC_PRIMARY,roles.DATA_PRIMARY,roles.UTILITY_PRIMARY].includes(role))return Object.freeze({region:'main',navigation:'primary'});
  if(role===roles.INSPECTOR)return Object.freeze({region:orientation==='landscape'?'rail':'sheet',navigation:'context'});
  if(role===roles.DATA_CONTROL)return Object.freeze({region:orientation==='landscape'?'rail':'sheet',navigation:'context'});
  return Object.freeze({region:'route',navigation:'secondary'});
}
function mobileSurface(surface,orientation){return Object.freeze({...surface,presentation:mobilePlacement(surface,orientation)});}

class MobilePresenter {
  constructor(source=model){this.model=source;}
  present(context={}){
    const orientation=text(context.orientation||'portrait')==='landscape'?'landscape':'portrait';
    const core=this.model.snapshot(context),activityId=core.activity.id;
    const remapWorkspace=row=>{
      const surfaces=row.surfaces.map(surface=>mobileSurface(surface,orientation));
      return Object.freeze({...row,surfaces:Object.freeze(surfaces),primary:surfaces.find(surface=>surface.kind==='primary')||row.primary,primes:Object.freeze(surfaces.filter(surface=>surface.kind==='prime')),subs:Object.freeze(surfaces.filter(surface=>surface.kind==='sub'))});
    };
    const workspaces=Object.freeze(core.workspaces.map(remapWorkspace)),active=workspaces.find(row=>row.activityId===activityId)||null;
    return Object.freeze({
      schema:'dkds.mobile-presentation.v1',platform:'mobile',presentationModel:core.schema,protocol:Number(context.protocol)||3,revision:core.revision,ready:core.project.ready,
      projectTitle:core.project.title,projects:core.project.items,activityId,activityLabel:core.activity.label,status:core.status.message,history:core.history,
      theme:core.theme.id,themeTokens:core.theme.tokens,themeContractVersion:core.theme.contractVersion,themeMaterial:core.theme.material,themeAppearance:core.theme.appearance,
      themeComponents:core.theme.components,themeConsumption:core.theme.consumption,themeScientific:core.theme.scientific,
      route:core.route,workspaces,activities:workspaces,surfaces:active?.surfaces||Object.freeze([]),actions:active?.actions||Object.freeze([]),statusItems:core.status.items,
      canGoBack:!!context.canGoBack,orientation
    });
  }
}

const desktop=new DesktopPresenter(),mobile=new MobilePresenter();
const api=Object.freeze({
  version:'1.2.0',roles,model,presenters:Object.freeze({desktop,mobile}),desktopNavigation,desktopWorkspaceSurfaces,
  configure:next=>{model.configure(next);return api;},
  setStatus:message=>model.setStatus(message),
  snapshot:context=>model.snapshot(context),
  present:(platform='desktop',context={})=>platform==='mobile'?mobile.present(context):desktop.present(context)
});
if(typeof window!=='undefined'){
  window.DKDSPresentation=api;
  window.addEventListener?.('dkds:status-changed',event=>model.setStatus(event?.detail?.message));
}
module.exports=api;
