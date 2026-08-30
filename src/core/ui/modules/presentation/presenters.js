'use strict';
const {model,roles}=require('./model');

const text=value=>String(value??'');

class DesktopPresenter {
  constructor(source=model){this.model=source;}
  present(context={}){
    const snapshot=this.model.snapshot(context);
    return Object.freeze({...snapshot,schema:'dkds.desktop-presentation.v1',presentationModel:snapshot.schema,platform:'desktop'});
  }
}

function mobilePlacement(surface,orientation='portrait'){
  const role=text(surface?.role);
  if(role===roles.SCIENTIFIC_PRIMARY)return Object.freeze({region:'main',navigation:'primary'});
  if(role===roles.INSPECTOR)return Object.freeze({region:orientation==='landscape'?'rail':'sheet',navigation:'context'});
  if(role===roles.DATA_CONTROL)return Object.freeze({region:orientation==='landscape'?'rail':'sheet',navigation:'context'});
  return Object.freeze({region:'route',navigation:'secondary'});
}
function mobileSurface(surface,orientation){return Object.freeze({...surface,presentation:mobilePlacement(surface,orientation)});}

class MobilePresenter {
  constructor(source=model){this.model=source;}
  present(context={}){
    const orientation=text(context.orientation||'portrait')==='landscape'?'landscape':'portrait';
    const core=this.model.snapshot(context),activityId=core.activity.id,workspace=core.workspaces.find(row=>row.activityId===activityId)||null;
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
  version:'1.0.0',roles,model,presenters:Object.freeze({desktop,mobile}),
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
