'use strict';
const {state, commandMenuPortals}=require('../context');
const {reflowActivities}=require('../activity/shell');
const {closeContextOverflowPopup,openContextOverflowPopup,reflowContextToolbar}=require('../shell/context-toolbar');
const {listContributions}=require('../contributions/typed');
  function isTypingTarget(target){
    if(!target)return false;
    const tag=String(target.tagName||'').toLowerCase();
    return ['input','textarea','select'].includes(tag)||!!target.isContentEditable;
  }
  function dispatchPluginShortcut(event){
    if(!event||event.defaultPrevented)return false;
    const rows=listContributions('ui.shortcuts')
      .filter(row=>!row.value?.activity||row.value.activity===state.activeActivityId)
      .sort((a,b)=>(Number(b.value?.priority)||0)-(Number(a.value?.priority)||0)||(Number(a.value?.order)||100)-(Number(b.value?.order)||100));
    for(const row of rows){
      const spec=row.value||{};
      if(isTypingTarget(event.target)&&!spec.allowTyping)continue;
      let match=false;
      try{match=typeof spec.match==='function'?!!spec.match(event,{host:state.host,activityId:state.activeActivityId,pluginId:row.pluginId}):false;}
      catch(err){console.error(`[DKDS shortcut match:${row.pluginId}/${row.id}]`,err);continue;}
      if(!match)continue;
      try{
        const handled=spec.handler?.({event,host:state.host,activityId:state.activeActivityId,pluginId:row.pluginId})!==false;
        if(handled){
          event.preventDefault?.();
          event.stopImmediatePropagation?.();
          event.stopPropagation?.();
          return true;
        }
      }catch(err){
        console.error(`[DKDS shortcut:${row.pluginId}/${row.id}]`,err);
        state.host?.setStatus?.(`插件快捷键执行失败：${err.message}`);
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }
    }
    return false;
  }
  const TRANSLUCENT_COMMAND_MENU_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass']);
  function commandMenuPortalEnabled(){
    const recipe=String(globalThis.DKDSTheme?.recipePolicy?.()?.popover||'').trim();
    return TRANSLUCENT_COMMAND_MENU_RECIPES.has(recipe);
  }
  function commandMenuAnchorButton(menu){
    return commandMenuPortals.get(menu)?.button||menu?.closest?.('.menu-anchor')?.querySelector?.('[aria-expanded]')||null;
  }
  function shellCommandMenus(){
    const menus=new Set(document.querySelectorAll('.menu-anchor .command-menu'));
    document.querySelectorAll('.command-menu.dkds-command-menu-portal').forEach(menu=>menus.add(menu));
    return [...menus];
  }
  function positionCommandMenuPortal(button,menu){
    if(!button||!menu||menu.classList.contains('hidden'))return;
    const rect=button.getBoundingClientRect?.();if(!rect)return;
    const margin=8,gap=5,viewportWidth=Math.max(document.documentElement?.clientWidth||0,globalThis.innerWidth||0),viewportHeight=Math.max(document.documentElement?.clientHeight||0,globalThis.innerHeight||0);
    const menuRect=menu.getBoundingClientRect?.()||{width:0,height:0};
    const width=Math.max(178,menuRect.width||menu.offsetWidth||0),height=Math.max(0,menuRect.height||menu.offsetHeight||0);
    const alignLeft=!!button.closest?.('.split-command-anchor');
    let left=alignLeft?rect.left:rect.right-width;
    left=Math.max(margin,Math.min(left,Math.max(margin,viewportWidth-width-margin)));
    let top=rect.bottom+gap;
    if(height&&top+height>viewportHeight-margin&&rect.top-height-gap>=margin)top=rect.top-height-gap;
    top=Math.max(margin,Math.min(top,Math.max(margin,viewportHeight-Math.min(height,viewportHeight-margin*2)-margin)));
    menu.style.left=`${Math.round(left)}px`;menu.style.top=`${Math.round(top)}px`;menu.style.right='auto';
  }
  function portalCommandMenu(button,menu){
    if(!button||!menu||!commandMenuPortalEnabled())return false;
    let state=commandMenuPortals.get(menu);
    if(!state){
      const placeholder=document.createComment(`dkds-command-menu:${menu.id||'anonymous'}`);
      menu.parentNode?.insertBefore?.(placeholder,menu);
      state={placeholder,button};commandMenuPortals.set(menu,state);
    }else state.button=button;
    if(menu.parentNode!==document.body)document.body.appendChild(menu);
    menu.classList.add('dkds-command-menu-portal');
    // Resolve portal geometry while hidden from paint. Removing `.hidden` before
    // setting visibility allowed a transient frame at the menu's old flow
    // position on some Chromium builds, which looked like the menu flew upward.
    menu.style.visibility='hidden';
    menu.classList.remove('hidden');
    positionCommandMenuPortal(button,menu);
    menu.style.visibility='';
    return true;
  }
  function restoreCommandMenu(menu){
    if(!menu)return false;
    const state=commandMenuPortals.get(menu);
    if(state?.placeholder?.parentNode){
      state.placeholder.parentNode.insertBefore(menu,state.placeholder.nextSibling);
      state.placeholder.remove();
    }
    menu.classList.remove('dkds-command-menu-portal');
    for(const property of ['left','top','right','visibility'])menu.style.removeProperty(property);
    commandMenuPortals.delete(menu);
    return !!state;
  }
  function closeCommandMenu(menu){
    if(!menu)return false;
    const button=commandMenuAnchorButton(menu);
    menu.classList.add('hidden');
    button?.setAttribute?.('aria-expanded','false');
    restoreCommandMenu(menu);
    return true;
  }
  function closeOtherCommandMenus(except=null){
    shellCommandMenus().forEach(menu=>{if(menu!==except)closeCommandMenu(menu);});
  }
  function repositionPortaledCommandMenus(){
    document.querySelectorAll('.command-menu.dkds-command-menu-portal:not(.hidden)').forEach(menu=>positionCommandMenuPortal(commandMenuAnchorButton(menu),menu));
  }
  function bindShellOnce() {
    if(state.shellBound)return;
    state.shellBound=true;
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const overflowMenu=document.querySelector('#contextOverflowMenu');
    const activityMoreBtn=document.querySelector('#activityMoreBtn');
    const activityMoreMenu=document.querySelector('#activityMoreMenu');
    const toggle=(button,menu)=>{
      if(!button||!menu)return;
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const willOpen=menu.classList.contains('hidden');
        closeOtherCommandMenus(menu);
        document.querySelectorAll('[aria-expanded="true"]').forEach(b=>{if(b!==button)b.setAttribute('aria-expanded','false');});
        if(willOpen){
          if(commandMenuPortalEnabled())portalCommandMenu(button,menu);
          else menu.classList.remove('hidden');
          button.setAttribute('aria-expanded','true');
        }else closeCommandMenu(menu);
      });
    };
    // Ordinary shell menus declare their target in HTML, keeping the shell
    // extensible without hard-coding one JavaScript branch per menu.
    document.querySelectorAll('[data-menu-target]').forEach(button=>{
      const menu=document.getElementById(button.dataset.menuTarget||'');
      toggle(button,menu);
    });
    if(overflowBtn&&overflowMenu){
      overflowBtn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openContextOverflowPopup(overflowBtn,overflowMenu,{closeOtherMenus:closeOtherCommandMenus});});
    }
    toggle(activityMoreBtn,activityMoreMenu);
    document.querySelectorAll('.menu-anchor .command-menu').forEach(menu=>{
      menu.addEventListener('click',event=>{
        if(event.target.closest('button')&&!event.target.closest('[data-menu-target]'))closeCommandMenu(menu);
      });
    });
    window.addEventListener?.('keydown',dispatchPluginShortcut,{capture:true});
    document.addEventListener?.('click',event=>{
      if(!event.target.closest('.menu-anchor')&&!event.target.closest('.command-menu.dkds-command-menu-portal')){
        closeOtherCommandMenus();
        document.querySelectorAll('.menu-anchor [aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
      }
      if(!event.target.closest('.context-overflow-anchor')&&!event.target.closest('.dkds-context-menu'))closeContextOverflowPopup();
      if(!event.target.closest('.activity-more-anchor')&&!event.target.closest('.activity-more-menu'))closeCommandMenu(activityMoreMenu);
    });
    globalThis.addEventListener?.('dkds:theme-profile-changed',()=>{
      if(commandMenuPortalEnabled())return;
      document.querySelectorAll('.command-menu.dkds-command-menu-portal').forEach(menu=>restoreCommandMenu(menu));
    });
    if(window.ResizeObserver){
      state.shellResizeObserver=new ResizeObserver(()=>{reflowContextToolbar();reflowActivities();repositionPortaledCommandMenus();});
      const context=document.querySelector('.context-commandbar');
      const activity=document.querySelector('.activity-switcher');
      const topbar=document.querySelector('.topbar-primary');
      if(context)state.shellResizeObserver.observe(context);
      if(activity)state.shellResizeObserver.observe(activity);
      if(topbar)state.shellResizeObserver.observe(topbar);
    }else{
      window.addEventListener?.('resize',()=>{reflowContextToolbar();reflowActivities();repositionPortaledCommandMenus();},{passive:true});
    }
  }
module.exports=Object.freeze({isTypingTarget, dispatchPluginShortcut, TRANSLUCENT_COMMAND_MENU_RECIPES, commandMenuPortalEnabled, commandMenuAnchorButton, shellCommandMenus, positionCommandMenuPortal, portalCommandMenu, restoreCommandMenu, closeCommandMenu, closeOtherCommandMenus, repositionPortaledCommandMenus, bindShellOnce});
