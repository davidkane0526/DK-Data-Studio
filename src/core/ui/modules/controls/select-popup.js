'use strict';
const {ContextMenu}=require('../interaction/context-actions');

const owner='core-select-popup';
let menu=null;
let activeSelect=null;
let installed=false;

function eligible(select){
  return typeof HTMLSelectElement!=='undefined'&&select instanceof HTMLSelectElement
    && !select.multiple
    && Number(select.size||0)<=1
    && !select.disabled
    && select.dataset.dkdsNativePopup!=='true';
}
function targetSelect(target){
  const select=target?.closest?.('select');
  if(!select||!document.documentElement.contains(select)||!eligible(select))return null;
  return select;
}
function menuItems(select){
  const rows=[];
  for(const child of select.children){
    if(child instanceof HTMLOptGroupElement){
      if(rows.length)rows.push({type:'separator'});
      for(const option of child.children){
        if(!(option instanceof HTMLOptionElement))continue;
        rows.push(optionItem(select,option,child.disabled));
      }
      continue;
    }
    if(child instanceof HTMLOptionElement)rows.push(optionItem(select,child,false));
  }
  return rows;
}
function optionItem(select,option,parentDisabled){
  return {
    id:String(option.value),
    label:String(option.label||option.textContent||option.value),
    selected:option.selected,
    enabled:!(option.disabled||parentDisabled),
    onInvoke:()=>{
      const previous=select.value;
      select.value=option.value;
      if(previous!==select.value){
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      select.focus({preventScroll:true});
    }
  };
}
function open(select){
  if(!eligible(select))return false;
  menu?.dispose?.();
  activeSelect=select;
  const rect=select.getBoundingClientRect();
  menu=new ContextMenu(owner,{onClose:()=>{
    activeSelect?.setAttribute?.('aria-expanded','false');
    activeSelect=null;
  }});
  select.setAttribute('aria-haspopup','listbox');
  select.setAttribute('aria-expanded','true');
  const el=menu.open({
    x:rect.left,
    y:rect.bottom+3,
    minWidth:Math.max(120,Math.ceil(rect.width)),
    maxHeight:Math.max(120,Math.min(360,Math.floor(window.innerHeight-rect.bottom-16))),
    role:'listbox',
    items:menuItems(select),
    context:{select}
  });
  if(!el){select.setAttribute('aria-expanded','false');return false;}
  el.classList.add('dkds-select-popup');
  el.dataset.dkdsControl='select-popup';
  const selected=el.querySelector('[aria-selected="true"]');
  queueMicrotask(()=>{
    (selected||el.querySelector('button:not(:disabled)'))?.focus?.({preventScroll:true});
    selected?.scrollIntoView?.({block:'nearest'});
  });
  return true;
}
function onPointerDown(event){
  if(event.button!==undefined&&event.button!==0)return;
  const select=targetSelect(event.target);if(!select)return;
  event.preventDefault();
  event.stopPropagation();
  select.focus({preventScroll:true});
  open(select);
}
function onKeyDown(event){
  const select=targetSelect(event.target);if(!select)return;
  const key=String(event.key||'');
  const opens=key==='Enter'||key===' '||(event.altKey&&key==='ArrowDown');
  if(!opens)return;
  event.preventDefault();event.stopPropagation();open(select);
}
function onChange(event){
  if(event.target===activeSelect&&menu?.element){
    const value=String(activeSelect.value);
    for(const button of menu.element.querySelectorAll('.dkds-context-item'))button.setAttribute('aria-selected',button.dataset.value===value?'true':'false');
  }
}
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
  menu?.dispose?.();menu=null;activeSelect=null;
  document.removeEventListener('pointerdown',onPointerDown,true);
  document.removeEventListener('keydown',onKeyDown,true);
  document.removeEventListener('change',onChange,true);
}
install();
module.exports=Object.freeze({install,dispose,open,eligible});
