'use strict';

const text=value=>String(value??'');
const esc=value=>{
  const raw=text(value);
  if(globalThis.CSS?.escape)return globalThis.CSS.escape(raw);
  return raw.replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch.codePointAt(0).toString(16)} `);
};

class MobileWebSurfacePresenter {
  constructor(){this.activeActivity='';}
  clear(){
    if(typeof document==='undefined')return;
    for(const node of document.querySelectorAll('[data-dkds-mobile-region],[data-dkds-mobile-role],[data-dkds-mobile-navigation],[data-dkds-mobile-active]')){
      delete node.dataset.dkdsMobileRegion;delete node.dataset.dkdsMobileRole;delete node.dataset.dkdsMobileNavigation;delete node.dataset.dkdsMobileActive;
    }
    for(const root of document.querySelectorAll('[data-dkds-mobile-presentation]'))delete root.dataset.dkdsMobilePresentation;
    this.activeActivity='';
  }
  apply(snapshot={}){
    if(typeof document==='undefined')return {mode:'none',activityId:'',projected:0};
    const activityId=text(snapshot.activityId||snapshot.route?.activityId),workspace=(snapshot.workspaces||[]).find(row=>text(row.activityId)===activityId)||null;
    for(const root of document.querySelectorAll('[data-dkds-mobile-presentation]'))delete root.dataset.dkdsMobilePresentation;
    for(const node of document.querySelectorAll('[data-dkds-mobile-region],[data-dkds-mobile-role],[data-dkds-mobile-navigation],[data-dkds-mobile-active]')){
      delete node.dataset.dkdsMobileRegion;delete node.dataset.dkdsMobileRole;delete node.dataset.dkdsMobileNavigation;delete node.dataset.dkdsMobileActive;
    }
    const root=activityId?document.querySelector(`[data-dkds-workspace-activity="${esc(activityId)}"]`):null;
    const semantic=!!root&&workspace?.presentationComplete===true;
    const mode=semantic?'semantic':'invalid';
    if(root)root.dataset.dkdsMobilePresentation=mode;
    let projected=0;
    if(semantic){
      for(const surface of workspace.surfaces||[]){
        const surfaceId=text(surface.surfaceId||surface.id);if(!surfaceId)continue;
        const selector=`[data-dkds-workspace-activity="${esc(activityId)}"][data-dkds-workspace-surface-id="${esc(surfaceId)}"]`;
        const node=document.querySelector(selector);if(!node)continue;
        node.dataset.dkdsMobileRegion=text(surface.presentation?.region||'route');
        node.dataset.dkdsMobileRole=text(surface.role);
        node.dataset.dkdsMobileNavigation=text(surface.presentation?.navigation);
        node.dataset.dkdsMobileActive=surface.active?'true':'false';
        projected++;
      }
    }
    this.activeActivity=activityId;
    return {mode,activityId,projected};
  }
}

const instance=new MobileWebSurfacePresenter();
const api=Object.freeze({version:'1.0.0',MobileWebSurfacePresenter,apply:snapshot=>instance.apply(snapshot),clear:()=>instance.clear()});
if(typeof window!=='undefined')window.DKDSMobileWebPresentation=api;
module.exports=api;
