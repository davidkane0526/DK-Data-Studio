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
  const rows=(workspace.surfaces||[]).filter(surface=>text(surface?.kind)!=='primary'&&surface?.embedded!==true).map(desktopSurfaceItem);
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

function mobileViewportProfile(context={}){
  const orientation=text(context.orientation||'portrait')==='landscape'?'landscape':'portrait';
  const viewport=context.viewport&&typeof context.viewport==='object'?context.viewport:{};
  const width=Math.max(0,Number(viewport.width)||0),height=Math.max(0,Number(viewport.height)||0);
  const resolvedWidth=width||(orientation==='landscape'?720:390);
  const portrait=orientation==='portrait';
  const profile=portrait
    ?(resolvedWidth>=1180?'expanded':resolvedWidth>=900?'wide':'compact')
    :(resolvedWidth>=980?'expanded':resolvedWidth>=680?'wide':'compact');
  return Object.freeze({profile,orientation,viewport:Object.freeze({width,height})});
}
function mobilePlacement(surface,layout,workspacePrimaryRole=''){
  const role=text(surface?.role),kind=text(surface?.kind),profile=text(layout?.profile||'compact'),primaryRole=text(workspacePrimaryRole);
  if([roles.SCIENTIFIC_PRIMARY,roles.DATA_PRIMARY,roles.UTILITY_PRIMARY].includes(role))return Object.freeze({region:'main',navigation:'primary'});
  if(role===roles.DATA_CONTROL)return Object.freeze({region:'drawer',navigation:'context'});
  // Inspectors share one right companion topology in both orientations.
  // Other embedded PRIME content retains its authored primary flow.
  if(kind==='prime'&&surface?.embedded===true)return Object.freeze({region:role===roles.INSPECTOR?'companion-right':'workspace-inline',navigation:'context'});
  if(role===roles.INSPECTOR)return Object.freeze({region:'companion-right',navigation:'context'});
  if(role===roles.SCIENTIFIC_SECONDARY&&kind==='prime'&&primaryRole===roles.DATA_PRIMARY)return Object.freeze({region:'workspace-inline',navigation:'context'});
  if(role===roles.SCIENTIFIC_SECONDARY&&kind==='prime')return Object.freeze({region:'companion-bottom',navigation:'context'});
  return Object.freeze({region:'route',navigation:'secondary'});
}
function mobileSurface(surface,layout,route={},workspaceActivityId='',openSurfaces=[],workspacePrimaryRole=''){
  const placement=mobilePlacement(surface,layout,workspacePrimaryRole),kind=text(surface?.kind),surfaceId=text(surface?.surfaceId||surface?.id),routeSurfaceId=text(route?.surfaceId),routeActivityId=text(route?.activityId);
  const routeOwnsWorkspace=!routeActivityId||routeActivityId===text(workspaceActivityId),open=new Set((Array.isArray(openSurfaces)?openSurfaces:[]).map(text));
  let active=!!surface?.active;
  if(kind==='primary')active=routeOwnsWorkspace&&!routeSurfaceId&&surface?.active!==false;
  else if(kind==='prime')active=routeOwnsWorkspace&&open.has(surfaceId)&&surface?.active!==false;
  else if(kind==='sub')active=routeOwnsWorkspace&&!!routeSurfaceId&&(routeSurfaceId===surfaceId||routeSurfaceId===text(surface?.id))&&surface?.active!==false;
  return Object.freeze({...surface,active,presentation:placement});
}

class MobilePresenter {
  constructor(source=model){this.model=source;}
  present(context={}){
    const layout=mobileViewportProfile(context),core=this.model.snapshot(context),activityId=core.activity.id,route=context.route||core.route||{},openSurfaces=context.openSurfaces&&typeof context.openSurfaces==='object'?context.openSurfaces:{};
    const remapWorkspace=row=>{
      const primaryRole=text(row.primary?.role||row.surfaces?.find(surface=>surface.kind==='primary')?.role);
      const surfaces=row.surfaces.map(surface=>mobileSurface(surface,layout,route,row.activityId,openSurfaces[row.activityId]||[],primaryRole));
      return Object.freeze({...row,surfaces:Object.freeze(surfaces),primary:surfaces.find(surface=>surface.kind==='primary')||row.primary,primes:Object.freeze(surfaces.filter(surface=>surface.kind==='prime')),subs:Object.freeze(surfaces.filter(surface=>surface.kind==='sub'))});
    };
    const workspaces=Object.freeze(core.workspaces.map(remapWorkspace)),active=workspaces.find(row=>row.activityId===activityId)||null;
    return Object.freeze({
      schema:'dkds.mobile-presentation.v1',platform:'mobile',presentationModel:core.schema,protocol:Number(context.protocol)||3,revision:core.revision,ready:core.project.ready,
      appVersion:core.appVersion,projectTitle:core.project.title,projects:core.project.items,activityId,activityLabel:core.activity.label,status:core.status.message,history:core.history,
      theme:core.theme.id,themeTokens:core.theme.tokens,themeContractVersion:core.theme.contractVersion,themeMaterial:core.theme.material,themeAppearance:core.theme.appearance,
      themeComponents:core.theme.components,themeConsumption:core.theme.consumption,themeScientific:core.theme.scientific,
      route:core.route,layout,workspaces,activities:workspaces,surfaces:active?.surfaces||Object.freeze([]),actions:active?.actions||Object.freeze([]),statusItems:core.status.items,
      canGoBack:!!context.canGoBack,orientation:layout.orientation
    });
  }
}

const desktop=new DesktopPresenter(),mobile=new MobilePresenter();
const api=Object.freeze({
  version:'1.5.0',roles,model,presenters:Object.freeze({desktop,mobile}),desktopNavigation,desktopWorkspaceSurfaces,
  configure:next=>{model.configure(next);return api;},
  setStatus:message=>model.setStatus(message),
  snapshot:context=>model.snapshot(context),
  audit:()=>model.presentationAudit(),
  present:(platform='desktop',context={})=>platform==='mobile'?mobile.present(context):desktop.present(context)
});
if(typeof window!=='undefined'){
  window.DKDSPresentation=api;
  window.addEventListener?.('dkds:status-changed',event=>model.setStatus(event?.detail?.message));
}
module.exports=api;
