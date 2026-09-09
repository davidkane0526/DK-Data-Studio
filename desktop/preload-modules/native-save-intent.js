'use strict';

const INTENT_TTL_MS=60000;
const SAVE_CONTROL_SELECTOR='[data-dkds-native-save]';

function text(value){return String(value??'').trim();}
function describeControl(control){
  if(!control)return '';
  const tag=text(control.tagName).toLowerCase();
  const id=text(control.id);const action=text(control.dataset?.actionId||control.dataset?.value||control.dataset?.dkdsCoreAction);
  const label=text(control.getAttribute?.('aria-label')||control.getAttribute?.('title')||control.textContent).replace(/\s+/g,' ').slice(0,120);
  return [tag,id&&`#${id}`,action&&`action=${action}`,label&&`label=${label}`].filter(Boolean).join(' ');
}
function classifyControl(target){
  // Native file dialogs are fail-closed.  A generic document-level click
  // listener must never infer filesystem authority from button text, ids,
  // classes, menu ancestry or translated labels.  The old heuristic was the
  // erroneous listener path that could turn unrelated UI activation into a
  // save/export authorization.  Only the owning control may opt in explicitly.
  const control=target?.closest?.(SAVE_CONTROL_SELECTOR)||null;if(!control)return null;
  const explicit=text(control.dataset?.dkdsNativeSave).toLowerCase();
  if(explicit!=='project'&&explicit!=='export')return null;
  return {kind:explicit,control,reason:'explicit-owner'};
}
function isConcreteNativePath(value){
  const path=text(value);if(!path)return false;
  if(/^[a-z][a-z0-9+.-]*:\/\//i.test(path))return false;
  return /^(?:[a-z]:[\\/]|\\\\|\/)/i.test(path);
}
function createNativeSaveIntentController({now=()=>Date.now(),report=()=>{}}={}){
  let active=null,seq=0;
  const diagnostics={captured:0,consumed:0,blocked:0,cleared:0,lastCaptured:null,lastConsumed:null,lastBlocked:null,lastInput:null};
  function snapshot(){return Object.freeze({...diagnostics,active:active?{...active}:null});}
  function clear(reason='input'){
    if(active){active=null;diagnostics.cleared+=1;}
    diagnostics.lastInput={reason,at:now()};
  }
  function capture(kind,meta={}){
    const row={id:`save-intent-${++seq}`,kind:kind==='project'?'project':'export',at:now(),source:text(meta.source||''),control:text(meta.control||''),reason:text(meta.reason||'')};
    active=row;diagnostics.captured+=1;diagnostics.lastCaptured={...row};diagnostics.lastInput={reason:'save-intent',at:row.at,control:row.control};return row;
  }
  function captureEvent(event){
    if(!event||event.isTrusted===false)return false;
    if(event.type==='keydown'){
      if((event.ctrlKey||event.metaKey)&&text(event.key).toLowerCase()==='s')return !!capture('project',{source:'keyboard',control:'Ctrl/Cmd+S',reason:'shortcut'});
      return false;
    }
    const classified=classifyControl(event.target);
    if(classified){capture(classified.kind,{source:'trusted-click',control:describeControl(classified.control),reason:classified.reason});return true;}
    clear('non-save-click');return false;
  }
  function consume(kind,meta={}){
    const expected=kind==='project'?'project':'export',at=now();
    if(active&&at-active.at<=INTENT_TTL_MS&&(active.kind===expected||active.kind==='export'&&expected==='project'&&meta.allowExportForProject===true)){
      const row={...active,consumedAt:at,requestSource:text(meta.source||'')};active=null;diagnostics.consumed+=1;diagnostics.lastConsumed=row;return Object.freeze({authorized:true,id:row.id,kind:row.kind,at:row.at,consumedAt:row.consumedAt,control:row.control,reason:row.reason,requestSource:row.requestSource});
    }
    if(active&&at-active.at>INTENT_TTL_MS)active=null;
    const blocked={kind:expected,source:text(meta.source||''),at,reason:active?'intent-kind-mismatch':'no-explicit-save-intent',lastInput:diagnostics.lastInput};
    diagnostics.blocked+=1;diagnostics.lastBlocked=blocked;try{report(blocked);}catch{}return null;
  }
  return Object.freeze({captureEvent,capture,clear,consume,snapshot,isConcreteNativePath});
}
function installNativeSaveIntentCapture(controller,{documentRef=globalThis.document,windowRef=globalThis.window}={}){
  if(!controller||!documentRef?.addEventListener)return()=>{};
  const click=event=>controller.captureEvent(event),key=event=>controller.captureEvent(event);
  documentRef.addEventListener('click',click,true);windowRef?.addEventListener?.('keydown',key,true);
  return()=>{documentRef.removeEventListener?.('click',click,true);windowRef?.removeEventListener?.('keydown',key,true);};
}

module.exports=Object.freeze({INTENT_TTL_MS,classifyControl,describeControl,isConcreteNativePath,createNativeSaveIntentController,installNativeSaveIntentCapture});
