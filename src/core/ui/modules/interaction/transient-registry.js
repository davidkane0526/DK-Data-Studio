'use strict';

// One lightweight lifecycle registry for transient interaction surfaces.
// Presentation code may dismiss them without importing the full ContextMenu /
// shortcut runtime.  Individual transient implementations remain the only
// owners of their DOM; this registry owns lifecycle membership only.
const OPEN_CONTEXT_MENUS=new Set();

function registerContextMenu(menu){if(menu)OPEN_CONTEXT_MENUS.add(menu);return menu;}
function unregisterContextMenu(menu){if(menu)OPEN_CONTEXT_MENUS.delete(menu);return OPEN_CONTEXT_MENUS.size;}
function dismissAllContextMenus(){for(const menu of [...OPEN_CONTEXT_MENUS])try{menu.close?.();}catch{}return OPEN_CONTEXT_MENUS.size;}
function openContextMenuCount(){return OPEN_CONTEXT_MENUS.size;}
function contextMenuInteractionWithin(target,ancestor){
  if(!target||!ancestor)return false;
  for(const menu of OPEN_CONTEXT_MENUS){
    const element=menu?.element,anchor=menu?.spec?.anchor||null;
    if(!element?.contains?.(target))continue;
    if(anchor===ancestor||ancestor.contains?.(anchor))return true;
  }
  return false;
}

module.exports=Object.freeze({registerContextMenu,unregisterContextMenu,dismissAllContextMenus,openContextMenuCount,contextMenuInteractionWithin});
