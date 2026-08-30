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
    this.panel='';
    this.installed=false;
    this.observer=null;
  }
  setDispatcher(dispatch){this.dispatcher=typeof dispatch==='function'?dispatch:null;return this;}
  setPublisher(publish){this.publisher=typeof publish==='function'?publish:null;return this;}
  fromHostRequest(method,payload={}){
    const meta={source:'mobile',modality:'native'};
    if(method==='navigate')return Intent.create(Intent.types.NAVIGATE,payload,meta);
    if(method==='back')return Intent.create(Intent.types.BACK,payload,meta);
    if(method==='command')return Intent.create(Intent.types.COMMAND,payload,meta);
    if(method==='panel')return Intent.create(Intent.types.PANEL,payload,meta);
    if(method==='surface')return Intent.create(Intent.types.SURFACE,payload,meta);
    if(method==='action')return Intent.create(Intent.types.ACTION,payload,meta);
    if(method==='status')return Intent.create(Intent.types.STATUS,payload,meta);
    return null;
  }
  fromHeldSwipe({dx=0,dy=0,heldMs=0,target=null}={}){
    if(heldMs<320)return null;
    let key='';
    if(dy<-44&&Math.abs(dy)>Math.abs(dx)*1.15)key='ArrowUp';
    else if(dx<-44&&Math.abs(dx)>Math.abs(dy)*1.15)key='ArrowLeft';
    if(!key)return null;
    return Intent.create(Intent.types.KEY,{key,target},{source:'mobile',modality:'gesture'});
  }
  panelState(){return Object.freeze({open:!!this.panel,name:this.panel});}
  togglePanel(name='left'){
    const normalized=text(name||'left');
    if(!['left','actions'].includes(normalized))throw new Error(`Unsupported mobile panel: ${normalized}`);
    const willOpen=this.panel!==normalized;
    this.panel=willOpen?normalized:'';
    if(typeof document!=='undefined'&&document.body){
      document.body.classList.toggle('dkds-mobile-panel-open',willOpen);
      if(willOpen)document.body.dataset.mobilePanel=normalized;else delete document.body.dataset.mobilePanel;
    }
    this.publisher?.();
    return {open:willOpen,name:normalized};
  }
  closeTransient(){
    if(this.panel){
      this.panel='';
      if(typeof document!=='undefined'&&document.body){document.body.classList.remove('dkds-mobile-panel-open');delete document.body.dataset.mobilePanel;}
      return true;
    }
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
    if(this.panel)return true;
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
    const storageKey='dkds.mobile.left-panel-width.v1';
    const restore=()=>{try{const saved=Number(localStorage.getItem(storageKey));if(Number.isFinite(saved)&&saved>=220)document.documentElement.style.setProperty('--dkds-mobile-left-width',`${saved}px`);}catch{}};
    const ensureHandle=()=>{
      const panel=document.querySelector('.dkds-analysis-left');if(!panel)return false;
      if(panel.querySelector('.dkds-mobile-panel-edge'))return true;
      const handle=document.createElement('div');handle.className='dkds-mobile-panel-edge';handle.dataset.dkdsTouchGestureOwner='mobile-panel-resize';handle.setAttribute('role','separator');handle.setAttribute('aria-label','拖动调整数据与参数面板宽度');panel.appendChild(handle);
      let drag=null;
      handle.addEventListener('pointerdown',event=>{drag={pointerId:event.pointerId};handle.setPointerCapture?.(event.pointerId);event.preventDefault();});
      handle.addEventListener('pointermove',event=>{if(!drag||drag.pointerId!==event.pointerId)return;const width=Math.max(240,Math.min(window.innerWidth*.92,event.clientX));document.documentElement.style.setProperty('--dkds-mobile-left-width',`${Math.round(width)}px`);event.preventDefault();});
      const finish=event=>{if(!drag||drag.pointerId!==event.pointerId)return;drag=null;const width=Math.round(panel.getBoundingClientRect().width);try{localStorage.setItem(storageKey,String(width));}catch{}window.dispatchEvent(new Event('resize'));};
      handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);return true;
    };
    restore();
    if(typeof MutationObserver!=='undefined'){
      this.observer=new MutationObserver(()=>{if(ensureHandle())this.observer?.disconnect?.();});
      if(!ensureHandle())this.observer.observe(document.body,{childList:true,subtree:true});
    }else ensureHandle();
    document.addEventListener('pointerdown',event=>{
      if(!this.panel)return;
      if(event.target?.closest?.('.dkds-analysis-left'))return;
      this.closeTransient();this.publisher?.();
    },true);
    let gesture=null;
    document.addEventListener('pointerdown',event=>{
      if(!['touch','pen'].includes(text(event.pointerType))||event.isPrimary===false)return;
      if(event.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],[data-dkds-touch-gesture-owner],.dkds-portable-header,.drag-handle,.dkds-portable-resize-handle,.dkds-movable-handle,[role=scrollbar],.dkds-table-column-resizer'))return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),target:event.target,fired:false};
    },true);
    document.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId||gesture.fired)return;
      const intent=this.fromHeldSwipe({dx:event.clientX-gesture.x,dy:event.clientY-gesture.y,heldMs:performance.now()-gesture.at,target:gesture.target});
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
