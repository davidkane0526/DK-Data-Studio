'use strict';
const Intent=require('./intent');

const text=value=>String(value??'');

class DesktopMouseKeyboardAdapter {
  constructor({dispatch=null}={}){this.dispatcher=typeof dispatch==='function'?dispatch:null;}
  setDispatcher(dispatch){this.dispatcher=typeof dispatch==='function'?dispatch:null;return this;}
  fromBinding(binding={},event=null){
    const type=text(binding.intent||binding.type).trim();
    if(!type)return null;
    const keyboard=event?.type==='keydown'||event?.type==='keyup'||(event?.type==='click'&&Number(event?.detail)===0);
    if(keyboard&&!['Enter',' ','Spacebar'].includes(text(event?.key)))return null;
    return Intent.create(type,binding.payload||{}, {
      source:'desktop',
      modality:keyboard?'keyboard':'pointer'
    });
  }
  dispatch(binding={},event=null,dispatcher=this.dispatcher){
    const intent=this.fromBinding(binding,event);
    if(!intent)return false;
    if(typeof dispatcher!=='function')return intent;
    return dispatcher(intent,{event,adapter:this});
  }
}

class MobileGestureAdapter {
  constructor({dispatch=null,publish=null}={}){
    this.dispatcher=typeof dispatch==='function'?dispatch:null;
    this.publisher=typeof publish==='function'?publish:null;
    this.installed=false;
  }
  setDispatcher(dispatch){this.dispatcher=typeof dispatch==='function'?dispatch:null;return this;}
  setPublisher(publish){this.publisher=typeof publish==='function'?publish:null;return this;}
  fromHostRequest(method,payload={}){
    const meta={source:'mobile',modality:'native'};
    if(method==='navigate')return Intent.create(Intent.types.NAVIGATE,payload,meta);
    if(method==='back')return Intent.create(Intent.types.BACK,payload,meta);
    if(method==='command')return Intent.create(Intent.types.COMMAND,payload,meta);
    if(method==='surface')return Intent.create(Intent.types.SURFACE,payload,meta);
    if(method==='action')return Intent.create(Intent.types.ACTION,payload,meta);
    if(method==='status')return Intent.create(Intent.types.STATUS,payload,meta);
    return null;
  }
  semanticSurfaceIntent(role=''){
    if(typeof window==='undefined')return null;
    const activityId=text(window.DKDSPlugins?.activities?.active?.()),rows=window.DKDSUI?.workspaces?.actions?.(activityId)||[];
    const row=rows.find(item=>text(item.presentationRole)===text(role));
    if(!activityId||!row)return null;
    return Intent.create(Intent.types.SURFACE,{activityId,id:text(row.surfaceId||row.id)},{source:'mobile',modality:'gesture'});
  }
  fromHeldSwipe({dx=0,dy=0,heldMs=0,target=null}={}){
    if(heldMs<320)return null;
    let key='';
    if(dy<-44&&Math.abs(dy)>Math.abs(dx)*1.15)key='ArrowUp';
    else if(dx<-44&&Math.abs(dx)>Math.abs(dy)*1.15)key='ArrowLeft';
    if(!key)return null;
    return Intent.create(Intent.types.KEY,{key,target},{source:'mobile',modality:'gesture'});
  }
  closeTransient(){
    if(typeof document==='undefined')return false;
    const visible=node=>!!node&&!node.classList?.contains('hidden')&&(typeof getComputedStyle!=='function'||getComputedStyle(node).display!=='none');
    const overlay=[...document.querySelectorAll('.dkds-dialog-overlay,.dkds-settings-overlay,#importPanel')].find(visible);
    if(overlay){
      (document.activeElement||document).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      return true;
    }
    const menus=[...document.querySelectorAll('.command-menu')].filter(visible);
    if(menus.length){menus.forEach(node=>node.classList.add('hidden'));return true;}
    return false;
  }
  canCloseTransient(){
    if(typeof document==='undefined')return false;
    const visible=node=>!!node&&!node.classList?.contains('hidden')&&(typeof getComputedStyle!=='function'||getComputedStyle(node).display!=='none');
    return [...document.querySelectorAll('.command-menu,.dkds-dialog-overlay,.dkds-settings-overlay,#importPanel')].some(visible);
  }
  dispatchIntent(intent,event=null){
    if(typeof this.dispatcher!=='function')return false;
    return this.dispatcher(intent,{event,adapter:this});
  }
  installDocumentBindings({dispatch=this.dispatcher,publish=this.publisher}={}){
    if(this.installed||typeof document==='undefined')return false;
    this.installed=true;this.setDispatcher(dispatch);this.setPublisher(publish);
    let gesture=null;
    document.addEventListener('pointerdown',event=>{
      if(event.isPrimary===false)return;
      const drawerFrameSelector='.dkds-mobile-surface-frame[data-dkds-mobile-frame-region="drawer"][data-dkds-mobile-active="true"]';
      const activeDrawerFrames=[...document.querySelectorAll?.(drawerFrameSelector)||[]];
      const eventPath=typeof event.composedPath==='function'?event.composedPath():[];
      const targetDrawerFrame=event.target?.closest?.(drawerFrameSelector)||activeDrawerFrames.find(frame=>eventPath.includes(frame)||frame.contains?.(event.target))||null;
      // Outside-dismiss is frame-owned. The projected plugin node, the resize
      // rail and every descendant control are all equally "inside" the drawer.
      // Looking for one particular direct-child shape made ordinary parameter
      // clicks look external after Presenter reparenting and toggled the surface
      // closed before the control could finish its interaction.
      if(activeDrawerFrames.length&&!targetDrawerFrame){
        const activeDrawerFrame=activeDrawerFrames.at(-1),activityId=text(window.DKDSPlugins?.activities?.active?.()),surfaceId=text(activeDrawerFrame?.dataset?.dkdsMobileSurfaceId);
        if(activityId&&surfaceId){const intent=Intent.create(Intent.types.SURFACE,{activityId,id:surfaceId},{source:'mobile',modality:'pointer'});this.dispatchIntent(intent,event);if(event.cancelable)event.preventDefault();event.stopPropagation?.();gesture=null;return;}
      }
      if(!['touch','pen'].includes(text(event.pointerType)))return;
      const interactive=event.target?.closest?.('input,textarea,select,option,button,a,label,[contenteditable="true"],[data-dkds-touch-gesture-owner],.dkds-portable-header,.drag-handle,.dkds-portable-resize-handle,.dkds-movable-handle,[role=scrollbar],.dkds-table-column-resizer');
      if(targetDrawerFrame){
        // Form controls own their complete pointer sequence. A drawer-close
        // swipe may begin only from non-interactive drawer chrome/content.
        if(interactive)return;
        gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),target:event.target,fired:false,mode:'drawer-close',surfaceId:text(targetDrawerFrame?.dataset?.dkdsMobileSurfaceId)};return;
      }
      if(event.clientX<=24&&!interactive){gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),target:event.target,fired:false,mode:'drawer-open'};return;}
      if(interactive)return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),target:event.target,fired:false,mode:'held-swipe'};
    },true);
    document.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId||gesture.fired)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      let intent=null;
      if(gesture.mode==='drawer-open'&&dx>58&&Math.abs(dx)>Math.abs(dy)*1.3)intent=this.semanticSurfaceIntent('data-control');
      else if(gesture.mode==='drawer-close'&&dx<-58&&Math.abs(dx)>Math.abs(dy)*1.3){
        const activityId=text(window.DKDSPlugins?.activities?.active?.());
        if(activityId&&gesture.surfaceId)intent=Intent.create(Intent.types.SURFACE,{activityId,id:gesture.surfaceId},{source:'mobile',modality:'gesture'});
      }else if(gesture.mode==='held-swipe')intent=this.fromHeldSwipe({dx,dy,heldMs:performance.now()-gesture.at,target:gesture.target});
      if(!intent)return;gesture.fired=true;this.dispatchIntent(intent,event);if(event.cancelable)event.preventDefault();
    },{capture:true,passive:false});
    const end=event=>{if(gesture?.id===event.pointerId)gesture=null;};
    document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
    return true;
  }
}

const desktop=new DesktopMouseKeyboardAdapter();
const mobile=new MobileGestureAdapter();
const api=Object.freeze({DesktopMouseKeyboardAdapter,MobileGestureAdapter,desktop,mobile});
if(typeof window!=='undefined')window.DKDSInputAdapters=api;
module.exports=api;
