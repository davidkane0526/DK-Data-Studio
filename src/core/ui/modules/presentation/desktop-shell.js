'use strict';
const Presentation=require('./presenters');
const Intent=require('../interaction/intent');
const {DesktopMouseKeyboardAdapter}=require('../interaction/adapters');

const text=value=>String(value??'');

function normalizePrimaryViewport(){
  const primary=document.querySelector?.('#primaryActivityBar');
  if(!primary)return false;
  // Chromium can retain a focus-induced horizontal scroll after a dedicated
  // TOP window closes. When the complete primary set fits, that offset is not
  // meaningful state and must never move the whole toolbar.
  if(primary.scrollWidth<=primary.clientWidth+1&&primary.scrollLeft!==0)primary.scrollLeft=0;
  return true;
}

class DesktopPresentationShell {
  constructor(){
    this.adapter=new DesktopMouseKeyboardAdapter({dispatch:(intent,context)=>this.dispatch(intent,context)});
  }
  async dispatch(intent){
    const types=Intent.types,payload=intent?.payload||{};
    if(intent?.type===types.NAVIGATE){
      const activityId=text(payload.activityId||payload.id);
      if(!activityId)throw new Error('Missing desktop activityId.');
      return window.DKDSPlugins?.activities?.set?.(activityId,{invoke:true});
    }
    if(intent?.type===types.SURFACE){
      const activityId=text(payload.activityId||window.DKDSPlugins?.activities?.active?.()),id=text(payload.id);
      if(!activityId||!id)throw new Error('Missing desktop workspace surface.');
      return window.DKDSUI?.workspaces?.invoke?.(activityId,id)===true;
    }
    if(intent?.type===types.ACTION){
      const activityId=text(payload.activityId||window.DKDSPlugins?.activities?.active?.()),id=text(payload.id),itemId=text(payload.itemId);
      if(!activityId||!id)throw new Error('Missing desktop workspace action.');
      return window.DKDSUI?.actions?.invoke?.(activityId,id,itemId)===true;
    }
    if(intent?.type===types.STATUS){
      const pluginId=text(payload.pluginId),id=text(payload.id);
      if(!pluginId||!id)throw new Error('Missing desktop status action.');
      return window.DKDSPlugins?.statusBar?.invoke?.(pluginId,id)===true;
    }
    if(intent?.type===types.COMMAND){
      const id=text(payload.id);if(!id)throw new Error('Missing desktop command id.');
      return window.DKDSPlugins?.commands?.run?.(id,payload);
    }
    return false;
  }
  bindButton(button,item){
    const binding={intent:Intent.types.NAVIGATE,payload:{activityId:item.activityId}};
    button.addEventListener('click',event=>{
      Promise.resolve(this.adapter.dispatch(binding,event)).then(()=>this.renderWorkspaceSurfaces()).catch(error=>{
        console.error(`[DKDS desktop navigation:${item.activityId}]`,error);
      });
    });
  }
  bindSurfaceButton(button,item){
    const activityId=text(item.activityId||window.DKDSPlugins?.activities?.active?.());
    const binding={intent:Intent.types.SURFACE,payload:{activityId,id:item.surfaceId}};
    button.addEventListener('click',event=>{
      Promise.resolve(this.adapter.dispatch(binding,event)).then(()=>this.renderWorkspaceSurfaces()).catch(error=>console.error(`[DKDS desktop surface:${activityId}/${item.surfaceId}]`,error));
    });
  }
  activityButton(item,{tool=false}={}){
    const button=document.createElement('button');button.type='button';
    button.className=tool?'plugin-menu-item tool-workspace-menu-item':'activity-tab';
    button.dataset.activityId=text(item.activityId);button.dataset.pluginId=text(item.pluginId);
    button.dataset.activityOrder=String(Number(item.order)||100);button.dataset.activityRole=text(item.workspaceRole);
    if(tool){button.dataset.toolWorkspaceEntry='1';button.dataset.pluginOrder=String(Number(item.order)||100);}
    else{
      button.classList.toggle('top-workspace-tab',item.workspaceRole==='top');
      button.classList.toggle('super-workspace-tab',!!item.isSuper);
      button.classList.toggle('top-level-activity-tab',item.slot==='primary');
      button.classList.toggle('active',!!item.active);
      button.setAttribute('aria-pressed',item.active?'true':'false');
    }
    button.setAttribute('aria-label',text(item.label||item.activityId));
    const icon=item.icon?`<span class="activity-icon" aria-hidden="true">${text(item.icon)}</span>`:'';
    button.innerHTML=`${icon}<span class="activity-label">${text(item.label||item.activityId)}</span>`;
    this.bindButton(button,item);return button;
  }
  surfaceButton(item,activityId){
    const button=document.createElement('button');button.type='button';button.className='toolbar-btn plugin-toolbar-btn dkds-presentation-command';
    button.dataset.dkdsPresentationSurface='1';button.dataset.dkdsPresentationSurfaceId=text(item.surfaceId||item.id||'surface');button.dataset.pluginActivity=text(activityId);button.dataset.pluginId=text(item.pluginId||'core.presentation');button.dataset.pluginSection='presentation-surfaces';button.dataset.pluginPriority=String(Number(item.priority)||0);button.dataset.pluginOrder=String(Math.max(1,110-(Number(item.priority)||0)));
    button.dataset.dkdsComponentIdentity='toolbarAction';button.dataset.dkdsComponentIdentityOwner='core-presentation-shell';button.dataset.dkdsComponentVariant=item.active?'active':'quiet';button.dataset.dkdsComponentVariantOwner='core-presentation-shell';
    const label=text(item.label||item.surfaceId);button.dataset.dkdsPresentationCompact=[...label].length<=3?'true':'false';button.textContent=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',item.active?'true':'false');button.classList.toggle('active',!!item.active);this.bindSurfaceButton(button,{...item,activityId});return button;
  }
  renderWorkspaceSurfaces(context={}){
    if(typeof document==='undefined')return false;
    const toolbar=document.querySelector('#pluginToolbarAnalysis');if(!toolbar)return false;
    const overflow=document.querySelector('#contextOverflowMenu');
    toolbar.querySelectorAll('[data-dkds-presentation-surface]').forEach(node=>node.remove());
    overflow?.querySelectorAll?.('[data-dkds-presentation-surface]')?.forEach?.(node=>node.remove());
    const snapshot=Presentation.present('desktop',{...context,isAuxiliaryWindow:!!context.isAuxiliaryWindow}),activityId=text(snapshot.activity?.id);
    for(const item of snapshot.workspaceSurfaces||[])toolbar.appendChild(this.surfaceButton(item,activityId));
    const buttons=[...toolbar.querySelectorAll(':scope > .plugin-toolbar-btn')];
    buttons.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)||String(a.id||'').localeCompare(String(b.id||'')));
    let lastSection='';for(const button of buttons){toolbar.appendChild(button);const section=String(button.dataset.pluginSection||'');button.classList.toggle('plugin-section-start',!!section&&section!==lastSection);if(section)lastSection=section;}
    queueMicrotask(()=>{try{window.dispatchEvent(new CustomEvent('dkds:context-toolbar-changed'));}catch{}});return snapshot.workspaceSurfaces;
  }
  renderNavigation(context={}){
    if(typeof document==='undefined')return false;
    const snapshot=Presentation.present('desktop',{...context,isAuxiliaryWindow:!!context.isAuxiliaryWindow});
    const primary=document.querySelector('#primaryActivityBar'),secondary=document.querySelector('#activityBar'),overflow=document.querySelector('#activityMoreMenu'),tools=document.querySelector('#pluginToolsMenu');
    if(!secondary)return false;
    primary?.replaceChildren();secondary.replaceChildren();overflow?.replaceChildren();
    tools?.querySelectorAll?.('[data-tool-workspace-entry]')?.forEach?.(node=>node.remove());
    for(const item of snapshot.navigation.primary)primary?.appendChild(this.activityButton(item));
    for(const item of snapshot.navigation.secondary)secondary.appendChild(this.activityButton(item));
    queueMicrotask(normalizePrimaryViewport);
    for(const item of snapshot.navigation.tools)tools?.appendChild(this.activityButton(item,{tool:true}));
    this.renderWorkspaceSurfaces(context);
    return snapshot.navigation;
  }
}

const shell=new DesktopPresentationShell();
const api=Object.freeze({version:'1.1.0',DesktopPresentationShell,shell,renderNavigation:context=>shell.renderNavigation(context),renderWorkspaceSurfaces:context=>shell.renderWorkspaceSurfaces(context),dispatch:intent=>shell.dispatch(intent)});
if(typeof window!=='undefined'){
  window.DKDSDesktopPresentationShell=api;
  window.addEventListener?.('dkds:workspace-presentation-changed',()=>shell.renderWorkspaceSurfaces());
  window.addEventListener?.('focus',()=>requestAnimationFrame(normalizePrimaryViewport));
}
module.exports=api;
