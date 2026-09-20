'use strict';
const {ContextMenu}=require('../interaction/context-actions');

const owner='core-select-popup';
let menu=null;
let activeSelect=null;
let activeAnchor=null;
let installed=false;

function singleEligible(select){
  return typeof HTMLSelectElement!=='undefined'&&select instanceof HTMLSelectElement
    && !select.multiple
    && Number(select.size||0)<=1
    && !select.disabled
    && select.dataset.dkdsNativePopup!=='true';
}
function proxyTarget(target){
  const anchor=target?.closest?.('[data-dkds-select-proxy]');
  if(!anchor||!document.documentElement.contains(anchor)||anchor.disabled)return null;
  const id=String(anchor.dataset.dkdsSelectProxy||'').trim();
  const select=id?document.getElementById(id):null;
  if(!(select instanceof HTMLSelectElement)||!select.multiple||select.disabled)return null;
  return {select,anchor};
}
function directTarget(target){
  const select=target?.closest?.('select');
  if(!select||!document.documentElement.contains(select)||!singleEligible(select))return null;
  return {select,anchor:select};
}
function controlTarget(target){return proxyTarget(target)||directTarget(target);}
function optionItem(select,option,parentDisabled,multiple){
  return {
    id:String(option.value),
    label:String(option.label||option.textContent||option.value),
    selected:option.selected,
    enabled:!(option.disabled||parentDisabled),
    closeOnInvoke:!multiple,
    onInvoke:()=>{
      const previous=multiple?[...select.selectedOptions].map(row=>row.value).join('\\u0000'):select.value;
      if(multiple)option.selected=!option.selected;else select.value=option.value;
      const next=multiple?[...select.selectedOptions].map(row=>row.value).join('\\u0000'):select.value;
      if(previous!==next){
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      syncMenuSelection(select);
      if(!multiple)activeAnchor?.focus?.({preventScroll:true});
    }
  };
}
function menuItems(select,multiple){
  const rows=[];
  for(const child of select.children){
    if(child instanceof HTMLOptGroupElement){
      if(rows.length)rows.push({type:'separator'});
      for(const option of child.children){
        if(!(option instanceof HTMLOptionElement))continue;
        rows.push(optionItem(select,option,child.disabled,multiple));
      }
      continue;
    }
    if(child instanceof HTMLOptionElement)rows.push(optionItem(select,child,false,multiple));
  }
  return rows;
}
function syncMenuSelection(select){
  if(select!==activeSelect||!menu?.element)return;
  const selected=new Set([...select.selectedOptions].map(row=>String(row.value)));
  for(const button of menu.element.querySelectorAll('.dkds-context-item'))button.setAttribute('aria-selected',selected.has(String(button.dataset.value||''))?'true':'false');
}
function open(select,anchor=select){
  const multiple=!!select?.multiple;
  if((multiple&&!(anchor?.dataset?.dkdsSelectProxy))||(!multiple&&!singleEligible(select)))return false;
  if(menu?.element&&activeSelect===select&&activeAnchor===anchor){menu.dispose();menu=null;return true;}
  menu?.dispose?.();
  activeSelect=select;activeAnchor=anchor;
  const rect=anchor.getBoundingClientRect();
  menu=new ContextMenu(owner,{anchor,closeOnInvoke:!multiple,onClose:()=>{
    activeAnchor?.setAttribute?.('aria-expanded','false');
    activeSelect=null;activeAnchor=null;
  }});
  anchor.setAttribute('aria-haspopup','listbox');
  anchor.setAttribute('aria-expanded','true');
  const el=menu.open({
    x:rect.left,
    y:rect.bottom+3,
    minWidth:Math.max(120,Math.ceil(rect.width)),
    maxHeight:Math.max(120,Math.min(360,Math.floor(window.innerHeight-rect.bottom-16))),
    role:'listbox',
    items:menuItems(select,multiple),
    context:{select,anchor,multiple}
  });
  if(!el){anchor.setAttribute('aria-expanded','false');return false;}
  el.classList.add('dkds-select-popup');
  el.dataset.dkdsControl=multiple?'multi-select-popup':'select-popup';
  if(multiple)el.setAttribute('aria-multiselectable','true');
  syncMenuSelection(select);
  const selected=el.querySelector('[aria-selected="true"]');
  queueMicrotask(()=>{
    (selected||el.querySelector('button:not(:disabled)'))?.focus?.({preventScroll:true});
    selected?.scrollIntoView?.({block:'nearest'});
  });
  return true;
}
function onPointerDown(event){
  if(event.button!==undefined&&event.button!==0)return;
  const row=controlTarget(event.target);if(!row)return;
  event.preventDefault();event.stopPropagation();
  row.anchor.focus?.({preventScroll:true});open(row.select,row.anchor);
}
function onKeyDown(event){
  const row=controlTarget(event.target);if(!row)return;
  const key=String(event.key||'');
  const opens=key==='Enter'||key===' '||(event.altKey&&key==='ArrowDown');
  if(!opens)return;
  event.preventDefault();event.stopPropagation();open(row.select,row.anchor);
}
function onChange(event){if(event.target===activeSelect)syncMenuSelection(activeSelect);}
function install(){
  if(installed||typeof document==='undefined'||typeof document.addEventListener!=='function')return;
  installed=true;
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('keydown',onKeyDown,true);
  document.addEventListener('change',onChange,true);
}
function dispose(){
  if(!installed||typeof document==='undefined'||typeof document.removeEventListener!=='function')return;
  installed=false;
  menu?.dispose?.();menu=null;activeSelect=null;activeAnchor=null;
  document.removeEventListener('pointerdown',onPointerDown,true);
  document.removeEventListener('keydown',onKeyDown,true);
  document.removeEventListener('change',onChange,true);
}
install();
const api=Object.freeze({install,dispose,open,eligible:singleEligible});
window.DKDSSelectPopup=api;
module.exports=api;
