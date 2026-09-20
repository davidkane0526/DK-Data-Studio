'use strict';
const {state}=require('../context');
const StyleGate=globalThis.DKDSStyleGate||null;
const OVERFLOW_DISMISS_OWNER='core.context-overflow.dismiss';
const OVERFLOW_DISMISS_SOURCE='src/core/plugins/kernel/modules/shell/context-toolbar.js';
function setTopbarBlankDismissible(enabled){
  const topbar=document.querySelector?.('.topbar-primary');
  if(!topbar||!StyleGate?.set||!StyleGate?.remove)return;
  if(enabled)StyleGate.set(topbar,'-webkit-app-region','no-drag',{owner:OVERFLOW_DISMISS_OWNER,scope:'context-overflow-dismiss',source:OVERFLOW_DISMISS_SOURCE});
  else StyleGate.remove(topbar,'-webkit-app-region',{owner:OVERFLOW_DISMISS_OWNER,scope:'context-overflow-dismiss',source:OVERFLOW_DISMISS_SOURCE});
}

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
  // The DOM menu is an overflow membership store, not a second visible layer.
  // It is shown only as a no-ContextMenu fallback and must always collapse here.
  document.querySelector('#contextOverflowMenu')?.classList.add('hidden');
  setTopbarBlankDismissible(false);
}
function contextOverflowItems(container){
  const buttons=[...container.children].filter(button=>button.matches?.('.plugin-toolbar-btn,.activity-tab[data-dkds-context-overflow-activity="1"]')&&!button.classList.contains('plugin-activity-hidden'));
  const items=[];let lastSection='',lastKind='';
  for(const button of buttons){
    const activity=button.matches?.('.activity-tab[data-dkds-context-overflow-activity="1"]'),section=activity?'primary-activity':String(button.dataset.pluginSection||'');
    if(items.length&&((activity&&lastKind!=='activity')||(!activity&&lastKind==='activity')||(section&&lastSection&&section!==lastSection)))items.push({type:'separator'});
    items.push({id:button.id||button.dataset.activityId||`overflow-${items.length}`,label:String(button.textContent||button.title||'功能').trim(),enabled:()=>!button.disabled,onInvoke:()=>button.click()});
    if(section)lastSection=section;lastKind=activity?'activity':'command';
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
  if(!Menu){
    const willOpen=container.classList.contains('hidden');
    container.classList.toggle('hidden',!willOpen);
    button.setAttribute('aria-expanded',willOpen?'true':'false');
    return;
  }
  const rect=button.getBoundingClientRect();
  const menu=state.contextOverflowPopup=new Menu('core.shell',{anchor:button,onClose:()=>{button.setAttribute('aria-expanded','false');setTopbarBlankDismissible(false);if(state.contextOverflowPopup===menu)state.contextOverflowPopup=null;}});
  button.setAttribute('aria-expanded','true');
  const opened=menu.open({x:Math.max(6,rect.right-184),y:rect.bottom+4,items});
  if(opened||menu.element)setTopbarBlankDismissible(true);
  else closeContextOverflowPopup();
}
function reflowContextToolbar(){
  const toolbar=document.querySelector('#pluginToolbarAnalysis'),overflow=document.querySelector('#contextOverflowMenu'),overflowBtn=document.querySelector('#contextOverflowBtn'),row=document.querySelector('.context-commandbar'),primary=document.querySelector('#primaryActivityBar');
  if(!toolbar||!overflow||!overflowBtn||!row)return;
  const buttonKey=(button,index)=>String(button?.dataset?.dkdsPresentationSurfaceId||button?.dataset?.activityId||button?.id||`${button?.dataset?.pluginId||''}:${button?.dataset?.pluginSection||''}:${String(button?.textContent||'').trim()}:${index}`);
  const overflowRows=()=>[...overflow.children].filter(node=>node.matches?.('.plugin-toolbar-btn,.activity-tab[data-dkds-context-overflow-activity="1"]'));
  const before=overflowRows().map(buttonKey).join('|');
  const popupOpen=!!state.contextOverflowPopup?.element;

  // Re-evaluate from the complete current-contract set on every real shell
  // resize. Context commands are sacrificed first; only then may whole primary
  // activity buttons move into the same `更多功能` menu. A primary activity is
  // never left half-visible in a horizontally clipped viewport.
  for(const child of [...overflow.querySelectorAll(':scope > .plugin-toolbar-btn')])toolbar.appendChild(child);
  if(primary)for(const child of [...overflow.querySelectorAll(':scope > .activity-tab[data-dkds-context-overflow-activity="1"]')]){delete child.dataset.dkdsContextOverflowActivity;primary.appendChild(child);}

  const sort=host=>{const rows=[...host.children].filter(el=>el.matches?.('.plugin-toolbar-btn,.plugin-main-tool-btn,.plugin-menu-item'));rows.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)||String(a.id||'').localeCompare(String(b.id||'')));for(const item of rows)host.appendChild(item);};
  const sortPrimary=()=>{if(!primary)return;const rows=[...primary.querySelectorAll(':scope > .activity-tab')].sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100)||String(a.dataset.activityId||'').localeCompare(String(b.dataset.activityId||'')));for(const item of rows)primary.appendChild(item);};
  sort(toolbar);sortPrimary();markToolbarSections(toolbar);
  // #contextOverflowMenu is storage only. The visible popup is owned by Core ContextMenu.
  // Keeping the storage container visible produced a second menu layer and made the
  // dropdown appear impossible to dismiss after the ContextMenu itself closed.
  overflow.classList.add('hidden');overflowBtn.classList.add('hidden');
  const px=value=>Number.parseFloat(value)||0,outerWidth=button=>{const rect=button.getBoundingClientRect(),style=getComputedStyle(button);return Math.ceil(rect.width+px(style.marginLeft)+px(style.marginRight));};
  const visible=[...toolbar.querySelectorAll(':scope > .plugin-toolbar-btn')].filter(b=>!b.classList.contains('plugin-activity-hidden'));
  if(visible.length){
    const rowStyle=getComputedStyle(row),toolbarStyle=getComputedStyle(toolbar);
    const available=Math.max(0,row.clientWidth-px(rowStyle.paddingLeft)-px(rowStyle.paddingRight));
    const gap=px(toolbarStyle.columnGap||toolbarStyle.gap);
    const widths=new Map(visible.map(button=>[button,outerWidth(button)]));
    const total=visible.reduce((sum,button)=>sum+(widths.get(button)||0),0)+Math.max(0,visible.length-1)*gap;
    if(total>available){
      overflowBtn.classList.remove('hidden');
      const rowGap=px(rowStyle.columnGap||rowStyle.gap),overflowWidth=outerWidth(overflowBtn),target=Math.max(0,available-overflowWidth-rowGap);
      const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
      const keep=new Set();let used=0;
      for(const button of ranked){const width=widths.get(button)||0,next=used+(keep.size?gap:0)+width;if(next<=target){keep.add(button);used=next;}}
      for(const button of visible)if(!keep.has(button))overflow.appendChild(button);
    }
  }

  const primaryClipped=()=>!!primary&&primary.scrollWidth>primary.clientWidth+1;
  if(primaryClipped()){
    overflowBtn.classList.remove('hidden');
    // Preserve complete plugin names before context commands. Lowest-priority
    // contextual actions move first, even when their own sub-lane still fits.
    const commands=[...toolbar.querySelectorAll(':scope > .plugin-toolbar-btn')].filter(b=>!b.classList.contains('plugin-activity-hidden')).sort((a,b)=>(Number(a.dataset.pluginPriority)||0)-(Number(b.dataset.pluginPriority)||0)||(Number(b.dataset.pluginOrder)||100)-(Number(a.dataset.pluginOrder)||100));
    for(const button of commands){if(!primaryClipped())break;overflow.appendChild(button);}
  }
  if(primaryClipped()){
    overflowBtn.classList.remove('hidden');
    const buttons=[...primary.querySelectorAll(':scope > .activity-tab')],activeId=String(buttons.find(button=>button.classList.contains('active'))?.dataset?.activityId||'');
    const candidates=buttons.slice().sort((a,b)=>{
      const aa=String(a.dataset.activityId||'')===activeId?1:0,bb=String(b.dataset.activityId||'')===activeId?1:0;
      return aa-bb||(Number(b.dataset.activityOrder)||100)-(Number(a.dataset.activityOrder)||100);
    });
    for(const button of candidates){if(!primaryClipped())break;button.dataset.dkdsContextOverflowActivity='1';overflow.appendChild(button);}
  }
  if(primary?.scrollLeft)primary.scrollLeft=0;

  const hasOverflow=overflowRows().length>0;
  // Storage remains hidden regardless of membership; only the trigger visibility changes.
  // openContextOverflowPopup() materializes one transient ContextMenu from these rows.
  overflow.classList.add('hidden');overflowBtn.classList.toggle('hidden',!hasOverflow);
  markToolbarSections(toolbar);markToolbarSections(overflow);
  const after=overflowRows().map(buttonKey).join('|');
  // A ResizeObserver may fire immediately after the popup opens. Preserve the
  // popup when the overflow membership did not change; closing/reopening here
  // was the visible one-frame flash reported on Desktop.
  if(popupOpen&&before!==after)closeContextOverflowPopup();
}
module.exports=Object.freeze({markToolbarSections,closeContextOverflowPopup,contextOverflowItems,openContextOverflowPopup,reflowContextToolbar});
