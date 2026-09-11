'use strict';

const INTENT_TTL_MS=5000;
const COPY_CONTROL_SELECTOR='[data-dkds-native-copy="clipboard"]';
const text=value=>String(value??'').trim();
function describeControl(control){
  if(!control)return'';
  const tag=text(control.tagName).toLowerCase(),id=text(control.id),action=text(control.dataset?.actionId||control.dataset?.value||control.dataset?.dkdsCoreAction);
  const label=text(control.getAttribute?.('aria-label')||control.getAttribute?.('title')||control.textContent).replace(/\s+/g,' ').slice(0,120);
  return[tag,id&&`#${id}`,action&&`action=${action}`,label&&`label=${label}`].filter(Boolean).join(' ');
}
function classifyControl(target){
  const control=target?.closest?.(COPY_CONTROL_SELECTOR)||null;
  return control?{kind:'clipboard',control,reason:'explicit-owner'}:null;
}
function createNativeClipboardIntentController({now=()=>Date.now(),report=()=>{}}={}){
  let active=null,seq=0;
  const diagnostics={captured:0,consumed:0,blocked:0,cleared:0,lastCaptured:null,lastConsumed:null,lastBlocked:null,lastInput:null};
  function snapshot(){return Object.freeze({...diagnostics,active:active?{...active}:null});}
  function clear(reason='input'){
    if(active){active=null;diagnostics.cleared+=1;}
    diagnostics.lastInput={reason,at:now()};
  }
  function capture(meta={}){
    const row={id:`clipboard-intent-${++seq}`,kind:'clipboard',at:now(),source:text(meta.source||''),control:text(meta.control||''),reason:text(meta.reason||'')};
    active=row;diagnostics.captured+=1;diagnostics.lastCaptured={...row};diagnostics.lastInput={reason:'clipboard-intent',at:row.at,control:row.control};return row;
  }
  function captureEvent(event){
    if(!event||event.isTrusted===false)return false;
    const classified=classifyControl(event.target);
    if(classified){capture({source:'trusted-click',control:describeControl(classified.control),reason:classified.reason});return true;}
    clear('non-copy-click');return false;
  }
  function consume(meta={}){
    const at=now();
    if(active&&at-active.at<=INTENT_TTL_MS){
      const row={...active,consumedAt:at,requestSource:text(meta.source||'')};active=null;diagnostics.consumed+=1;diagnostics.lastConsumed=row;
      return Object.freeze({authorized:true,id:row.id,kind:'clipboard',at:row.at,consumedAt:row.consumedAt,control:row.control,reason:row.reason,requestSource:row.requestSource});
    }
    if(active&&at-active.at>INTENT_TTL_MS)active=null;
    const blocked={kind:'clipboard',source:text(meta.source||''),at,reason:'no-explicit-copy-intent',lastInput:diagnostics.lastInput};
    diagnostics.blocked+=1;diagnostics.lastBlocked=blocked;try{report(blocked);}catch{}return null;
  }
  return Object.freeze({captureEvent,capture,clear,consume,snapshot});
}
function installNativeClipboardIntentCapture(controller,{documentRef=globalThis.document}={}){
  if(!controller||!documentRef?.addEventListener)return()=>{};
  const click=event=>controller.captureEvent(event);documentRef.addEventListener('click',click,true);
  return()=>documentRef.removeEventListener?.('click',click,true);
}

module.exports=Object.freeze({INTENT_TTL_MS,COPY_CONTROL_SELECTOR,classifyControl,describeControl,createNativeClipboardIntentController,installNativeClipboardIntentCapture});
