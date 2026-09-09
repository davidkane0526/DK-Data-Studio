'use strict';
const {state}=require('../context');

function markToolbarSections(hostEl){
  if(!hostEl)return;
  const buttons=[...hostEl.querySelectorAll(':scope > .plugin-toolbar-btn')].filter(b=>!b.classList.contains('plugin-activity-hidden'));
  let lastSection=null;
  for(const button of buttons){
    const section=button.dataset.pluginSection||'',isStart=!!section&&section!==lastSection;
    button.classList.toggle('plugin-section-start',isStart);
    // Section names organize the toolbar; visible buttons do not need duplicate tooltips.
    lastSection=section||lastSection;
  }
}
function closeContextOverflowPopup(){
  state.contextOverflowPopup?.dispose?.();state.contextOverflowPopup=null;
  document.querySelector('#contextOverflowBtn')?.setAttribute('aria-expanded','false');
}
function contextOverflowItems(container){
  const buttons=[...container.querySelectorAll(':scope > .plugin-toolbar-btn')].filter(button=>!button.classList.contains('plugin-activity-hidden'));
  const items=[];let lastSection='';
  for(const button of buttons){
    const section=String(button.dataset.pluginSection||'');
    if(items.length&&section&&lastSection&&section!==lastSection)items.push({type:'separator'});
    items.push({id:button.id||`overflow-${items.length}`,label:String(button.textContent||button.title||'功能').trim(),enabled:()=>!button.disabled,onInvoke:()=>button.click()});
    if(section)lastSection=section;
  }
  return items;
}
function openContextOverflowPopup(button,container,{closeOtherMenus}={}){
  if(!button||!container)return;
  if(state.contextOverflowPopup?.element){closeContextOverflowPopup();return;}
  const items=contextOverflowItems(container);if(!items.length)return;
  closeOtherMenus?.();
  document.querySelectorAll('[aria-expanded="true"]').forEach(node=>{if(node!==button)node.setAttribute('aria-expanded','false');});
  const Menu=window.DKDSUI?.ContextMenu;
  if(!Menu){container.classList.remove('hidden');button.setAttribute('aria-expanded','true');return;}
  const rect=button.getBoundingClientRect();
  const menu=state.contextOverflowPopup=new Menu('core.shell',{onClose:()=>{button.setAttribute('aria-expanded','false');if(state.contextOverflowPopup===menu)state.contextOverflowPopup=null;}});
  button.setAttribute('aria-expanded','true');
  menu.open({x:Math.max(6,rect.right-184),y:rect.bottom+4,items});
}
function reflowContextToolbar(){
  const toolbar=document.querySelector('#pluginToolbarAnalysis'),overflow=document.querySelector('#contextOverflowMenu'),overflowBtn=document.querySelector('#contextOverflowBtn'),row=document.querySelector('.context-commandbar');
  if(!toolbar||!overflow||!overflowBtn||!row)return;
  const buttonKey=(button,index)=>String(button?.dataset?.dkdsPresentationSurfaceId||button?.id||`${button?.dataset?.pluginId||''}:${button?.dataset?.pluginSection||''}:${String(button?.textContent||'').trim()}:${index}`);
  const before=[...overflow.querySelectorAll(':scope > .plugin-toolbar-btn')].map(buttonKey).join('|');
  const popupOpen=!!state.contextOverflowPopup?.element;
  for(const child of [...overflow.querySelectorAll('.plugin-toolbar-btn')])toolbar.appendChild(child);
  const sort=host=>{const rows=[...host.children].filter(el=>el.matches?.('.plugin-toolbar-btn,.plugin-main-tool-btn,.plugin-menu-item'));rows.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)||String(a.id||'').localeCompare(String(b.id||'')));for(const item of rows)host.appendChild(item);};
  sort(toolbar);markToolbarSections(toolbar);overflow.classList.add('hidden');overflowBtn.classList.add('hidden');
  const visible=[...toolbar.querySelectorAll(':scope > .plugin-toolbar-btn')].filter(b=>!b.classList.contains('plugin-activity-hidden'));
  if(visible.length){
    const rowStyle=getComputedStyle(row),toolbarStyle=getComputedStyle(toolbar);
    const px=value=>Number.parseFloat(value)||0;
    const available=Math.max(0,row.clientWidth-px(rowStyle.paddingLeft)-px(rowStyle.paddingRight));
    const gap=px(toolbarStyle.columnGap||toolbarStyle.gap),outerWidth=button=>{const rect=button.getBoundingClientRect(),style=getComputedStyle(button);return Math.ceil(rect.width+px(style.marginLeft)+px(style.marginRight));};
    const widths=new Map(visible.map(button=>[button,outerWidth(button)]));
    const total=visible.reduce((sum,button)=>sum+(widths.get(button)||0),0)+Math.max(0,visible.length-1)*gap;
    if(total>available){
      overflowBtn.classList.remove('hidden');
      const rowGap=px(rowStyle.columnGap||rowStyle.gap),overflowWidth=outerWidth(overflowBtn),target=Math.max(0,available-overflowWidth-rowGap);
      const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
      const keep=new Set();let used=0;
      for(const button of ranked){
        const width=widths.get(button)||0,next=used+(keep.size?gap:0)+width;
        if(next<=target){keep.add(button);used=next;}
      }
      for(const button of visible)if(!keep.has(button))overflow.appendChild(button);
      if(!overflow.children.length)overflowBtn.classList.add('hidden');
    }
  }
  markToolbarSections(toolbar);markToolbarSections(overflow);
  const after=[...overflow.querySelectorAll(':scope > .plugin-toolbar-btn')].map(buttonKey).join('|');
  // A ResizeObserver may fire immediately after the popup opens. Preserve the
  // popup when the overflow membership did not change; closing/reopening here
  // was the visible one-frame flash reported on Desktop.
  if(popupOpen&&before!==after)closeContextOverflowPopup();
}
module.exports=Object.freeze({markToolbarSections,closeContextOverflowPopup,contextOverflowItems,openContextOverflowPopup,reflowContextToolbar});
