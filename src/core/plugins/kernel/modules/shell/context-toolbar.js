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
  closeContextOverflowPopup();const items=contextOverflowItems(container);if(!items.length)return;
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
  closeContextOverflowPopup();
  const toolbar=document.querySelector('#pluginToolbarAnalysis'),overflow=document.querySelector('#contextOverflowMenu'),overflowBtn=document.querySelector('#contextOverflowBtn'),row=document.querySelector('.context-commandbar');
  if(!toolbar||!overflow||!overflowBtn||!row)return;
  for(const child of [...overflow.querySelectorAll('.plugin-toolbar-btn')])toolbar.appendChild(child);
  const sort=host=>{const rows=[...host.children].filter(el=>el.matches?.('.plugin-toolbar-btn,.plugin-main-tool-btn,.plugin-menu-item'));rows.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)||String(a.id||'').localeCompare(String(b.id||'')));for(const row of rows)host.appendChild(row);};
  sort(toolbar);overflow.classList.add('hidden');overflowBtn.classList.add('hidden');
  const visible=[...toolbar.querySelectorAll('.plugin-toolbar-btn')].filter(b=>!b.classList.contains('plugin-activity-hidden'));
  if(!visible.length){markToolbarSections(toolbar);return;}
  const available=Math.max(90,row.getBoundingClientRect().width),widths=new Map(visible.map(b=>[b,Math.ceil(b.getBoundingClientRect().width)+3])),total=visible.reduce((sum,b)=>sum+(widths.get(b)||0),0);
  if(total<=available){markToolbarSections(toolbar);return;}
  overflowBtn.classList.remove('hidden');const overflowWidth=Math.ceil(overflowBtn.getBoundingClientRect().width)||52,target=Math.max(54,available-overflowWidth-4);
  const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
  const keep=new Set();let used=0;
  for(const b of ranked){const w=widths.get(b)||0;if(used+w<=target||keep.size===0){keep.add(b);used+=w;}}
  for(const b of visible)if(!keep.has(b))overflow.appendChild(b);
  if(!overflow.children.length)overflowBtn.classList.add('hidden');
  markToolbarSections(toolbar);markToolbarSections(overflow);
}
module.exports=Object.freeze({markToolbarSections,closeContextOverflowPopup,contextOverflowItems,openContextOverflowPopup,reflowContextToolbar});
