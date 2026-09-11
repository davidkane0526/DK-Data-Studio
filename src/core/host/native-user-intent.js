'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&!root.DKDSNativeUserIntent)Object.defineProperty(root,'DKDSNativeUserIntent',{value:api,writable:false,configurable:false});
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TTL=Object.freeze({clipboard:5000,export:60000,project:60000});
  const SAVE_CONTROL_SELECTOR='[data-dkds-native-save]';
  const COPY_CONTROL_SELECTOR='[data-dkds-native-copy="clipboard"]';
  const text=value=>String(value??'').trim();
  const normalizeKind=value=>{
    const kind=text(value).toLowerCase();
    return kind==='project'||kind==='export'||kind==='clipboard'?kind:'';
  };
  function describeControl(control){
    if(!control)return'';
    const tag=text(control.tagName).toLowerCase(),id=text(control.id),action=text(control.dataset?.actionId||control.dataset?.value||control.dataset?.dkdsCoreAction);
    const label=text(control.getAttribute?.('aria-label')||control.getAttribute?.('title')||control.textContent).replace(/\s+/g,' ').slice(0,120);
    return[tag,id&&`#${id}`,action&&`action=${action}`,label&&`label=${label}`].filter(Boolean).join(' ');
  }
  function classifyControl(target){
    const copy=target?.closest?.(COPY_CONTROL_SELECTOR)||null;
    if(copy)return{kind:'clipboard',control:copy,reason:'explicit-copy-owner'};
    const save=target?.closest?.(SAVE_CONTROL_SELECTOR)||null;
    if(!save)return null;
    const kind=normalizeKind(save.dataset?.dkdsNativeSave);
    return kind==='project'||kind==='export'?{kind,control:save,reason:'explicit-save-owner'}:null;
  }
  function createController({now=()=>Date.now(),report=()=>{}}={}){
    let active=null,seq=0;
    const diagnostics={captured:0,consumed:0,blocked:0,cleared:0,lastCaptured:null,lastConsumed:null,lastBlocked:null,lastInput:null};
    function snapshot(){return Object.freeze({...diagnostics,active:active?{...active}:null});}
    function clear(reason='input'){
      if(active){active=null;diagnostics.cleared+=1;}
      diagnostics.lastInput={reason,at:now()};
    }
    function capture(kind,meta={}){
      const normalized=normalizeKind(kind);if(!normalized)return null;
      const row={id:`native-intent-${++seq}`,kind:normalized,at:now(),source:text(meta.source||''),control:text(meta.control||''),reason:text(meta.reason||'')};
      active=row;diagnostics.captured+=1;diagnostics.lastCaptured={...row};diagnostics.lastInput={reason:'native-intent',at:row.at,control:row.control};return row;
    }
    function captureEvent(event){
      if(!event||event.isTrusted===false)return false;
      if(event.type==='keydown'){
        if((event.ctrlKey||event.metaKey)&&text(event.key).toLowerCase()==='s')return!!capture('project',{source:'keyboard',control:'Ctrl/Cmd+S',reason:'shortcut'});
        return false;
      }
      const classified=classifyControl(event.target);
      if(classified){capture(classified.kind,{source:`trusted-${event.type||'input'}`,control:describeControl(classified.control),reason:classified.reason});return true;}
      clear(`non-native-${event.type||'input'}`);return false;
    }
    function consume(kind,meta={}){
      const expected=normalizeKind(kind),at=now(),ttl=TTL[expected]||0;
      if(expected&&active&&active.kind===expected&&at-active.at<=ttl){
        const row={...active,consumedAt:at,requestSource:text(meta.source||'')};active=null;diagnostics.consumed+=1;diagnostics.lastConsumed=row;
        return Object.freeze({authorized:true,id:row.id,kind:row.kind,at:row.at,consumedAt:row.consumedAt,control:row.control,reason:row.reason,requestSource:row.requestSource});
      }
      if(active&&at-active.at>(TTL[active.kind]||0))active=null;
      const blocked={kind:expected||text(kind),source:text(meta.source||''),at,reason:active?'intent-kind-mismatch':'no-explicit-native-intent',lastInput:diagnostics.lastInput};
      diagnostics.blocked+=1;diagnostics.lastBlocked=blocked;try{report(blocked);}catch{}return null;
    }
    return Object.freeze({captureEvent,capture,clear,consume,snapshot});
  }
  function install(controller,{documentRef=globalThis.document,windowRef=globalThis.window}={}){
    if(!controller||!documentRef?.addEventListener)return()=>{};
    const pointer=event=>controller.captureEvent(event),click=event=>controller.captureEvent(event),key=event=>controller.captureEvent(event);
    documentRef.addEventListener('pointerdown',pointer,true);
    documentRef.addEventListener('click',click,true);
    windowRef?.addEventListener?.('keydown',key,true);
    return()=>{
      documentRef.removeEventListener?.('pointerdown',pointer,true);
      documentRef.removeEventListener?.('click',click,true);
      windowRef?.removeEventListener?.('keydown',key,true);
    };
  }
  return Object.freeze({TTL,SAVE_CONTROL_SELECTOR,COPY_CONTROL_SELECTOR,normalizeKind,describeControl,classifyControl,createController,install});
});
