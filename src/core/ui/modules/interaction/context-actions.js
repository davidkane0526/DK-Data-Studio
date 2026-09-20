'use strict';
const {esc, resolveElement, cleanupCall, shortcutHub}=require('../foundation/shortcuts');
const StyleGate=require('ui/style-ownership-gate');
const {registerContextMenu,unregisterContextMenu,dismissAllContextMenus}=require('./transient-registry');
const CONTEXT_MENU_STYLE_OWNER='core.context-menu';
const STYLE_SOURCE='src/core/ui/modules/interaction/context-actions.js';
const menuSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:CONTEXT_MENU_STYLE_OWNER,component:'context-menu',scope:'runtime-context-menu',source:STYLE_SOURCE});
const menuRemove=(el,property)=>StyleGate.remove(el,property,{owner:CONTEXT_MENU_STYLE_OWNER,component:'context-menu',scope:'runtime-context-menu',source:STYLE_SOURCE});


  class ContextMenu {
    constructor(owner,spec={}){
      this.owner=owner;this.spec=spec;this.element=null;
      this.boundOutsidePointer=this.handleOutsidePointer.bind(this);
      this.boundBlur=this.close.bind(this);
      this.boundScroll=this.handleScroll.bind(this);
    }
    handleScroll(event){
      // A transient menu is anchored to viewport geometry. If its owning page
      // scrolls, keeping the menu open leaves it visually detached from the
      // control that opened it. Scrolling the menu itself is still allowed.
      if(this.element?.contains?.(event?.target))return;
      this.close();
    }
    handleOutsidePointer(event){
      // The previous implementation closed on *every* window pointerdown in
      // capture phase. That removed the menu before a menu item's click event
      // could fire, making all ContextMenu-backed controls look dead (TER
      // layout and every portable-view placement menu). Only outside presses
      // may close the menu. A declared anchor is part of the menu interaction
      // boundary so its click handler can perform a real toggle instead of the
      // capture-phase outside handler closing and the subsequent click opening
      // a fresh menu again.
      const target=event?.target,anchor=resolveElement(this.spec?.anchor)||this.spec?.anchor||null;
      if(this.element?.contains?.(target)||anchor?.contains?.(target)||anchor===target)return;
      this.close();
    }
    open({x,y,items=[],context={},minWidth=0,maxHeight=0,role='menu'}={}){
      this.close();
      const el=document.createElement('div');el.className='dkds-context-menu';el.dataset.owner=this.owner;el.setAttribute('role',String(role||'menu'));menuSet(el,'visibility','hidden');
      if(Number(minWidth)>0)menuSet(el,'min-width',`${Math.ceil(Number(minWidth))}px`);
      if(Number(maxHeight)>0){menuSet(el,'max-height',`${Math.ceil(Number(maxHeight))}px`);menuSet(el,'overflow-y','auto');}
      for(const item of items){
        if(typeof item.visible==='function'&&!item.visible(context))continue;if(item.visible===false)continue;
        if(item.type==='separator'){const sep=document.createElement('div');sep.className='dkds-context-separator';el.appendChild(sep);continue;}
        const b=document.createElement('button');b.type='button';b.className='dkds-context-item';b.dataset.dkdsComponentIdentity='menuItem';b.dataset.dkdsComponentIdentityOwner='core-context-menu';if(String(role)==='listbox')b.setAttribute('role','option');else b.setAttribute('role','menuitem');b.disabled=typeof item.enabled==='function'?!item.enabled(context):item.enabled===false;
        b.dataset.value=String(item.id??'');
        if(item.nativeSave)b.dataset.dkdsNativeSave=String(item.nativeSave==='project'?'project':'export');
        if(item.nativeCopy)b.dataset.dkdsNativeCopy='clipboard';
        if(item.selected===true)b.setAttribute('aria-selected','true');
        b.innerHTML=`${item.icon?`<span>${esc(item.icon)}</span>`:''}<span>${esc(typeof item.label==='function'?item.label(context):item.label||item.id||'')}</span>${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}`;
        b.onclick=e=>{e.stopPropagation();if(b.disabled)return;const keepOpen=item.closeOnInvoke===false||this.spec.closeOnInvoke===false;item.onInvoke?.({...context,event:e,item,button:b});if(!keepOpen)this.close();};el.appendChild(b);
      }
      if(!el.children.length)return null;
      el.addEventListener('keydown',event=>{
        const buttons=[...el.querySelectorAll('.dkds-context-item:not(:disabled)')];if(!buttons.length)return;
        const index=Math.max(0,buttons.indexOf(document.activeElement));
        if(event.key==='Escape'){event.preventDefault();this.close();return;}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();const delta=event.key==='ArrowDown'?1:-1;buttons[(index+delta+buttons.length)%buttons.length].focus({preventScroll:true});
        }
      });
      document.body.appendChild(el);this.element=el;registerContextMenu(this);
      // Menus are connected while paint-hidden, then Material + Component
      // appearance is composed synchronously before the first visible frame.
      // MutationObserver appearance assignment is intentionally asynchronous and
      // used to expose one fallback/browser-looking frame on Chromium/Electron.
      globalThis.DKDSMaterialSurface?.apply?.(el,'popover');
      globalThis.DKDSThemeComponentAppearance?.assign?.(el);
      const rect=el.getBoundingClientRect();const left=Math.max(6,Math.min(window.innerWidth-rect.width-6,Number(x)||0));const top=Math.max(6,Math.min(window.innerHeight-rect.height-6,Number(y)||0));menuSet(el,'left',`${left}px`);menuSet(el,'top',`${top}px`);menuRemove(el,'visibility');
      queueMicrotask(()=>{window.addEventListener('pointerdown',this.boundOutsidePointer,true);window.addEventListener('blur',this.boundBlur,{once:true});document.addEventListener('scroll',this.boundScroll,true);});
      return el;
    }
    close(){
      window.removeEventListener('pointerdown',this.boundOutsidePointer,true);
      window.removeEventListener('blur',this.boundBlur);
      document.removeEventListener('scroll',this.boundScroll,true);
      const hadElement=!!this.element;
      if(this.element){this.element.remove();this.element=null;}unregisterContextMenu(this);
      if(hadElement){try{this.spec.onClose?.();}catch{}}
    }
    dispose(){this.close();}
  }


  function installTransientScrollDismiss(){
    if(typeof document==='undefined'||typeof document.addEventListener!=='function'||document.__dkdsTransientScrollDismissInstalled)return false;
    Object.defineProperty(document,'__dkdsTransientScrollDismissInstalled',{value:true,configurable:true});
    const dismiss=event=>{
      const target=event?.target||null;
      const active=document.activeElement;
      if(active?.tagName==='SELECT'&&!active.contains?.(target))try{active.blur?.();}catch{}
    };
    document.addEventListener('scroll',dismiss,true);
    document.addEventListener('wheel',dismiss,{capture:true,passive:true});
    return true;
  }
  installTransientScrollDismiss();

  const ACTION_VARIANTS=new Set(['primary','secondary','selected','active','quiet','destructive']);
  function actionVariant(action={}){
    const declared=String(action.variant||action.tone||'').trim();
    if(ACTION_VARIANTS.has(declared))return declared;
    return String(action.className||'').split(/\s+/).find(name=>ACTION_VARIANTS.has(name))||'';
  }

  class ActionGroup {
    constructor(owner,container,spec={}){
      this.owner=owner;this.container=resolveElement(container);this.spec={...spec};this.actions=[];this.state={};this.cleanups=[];this.menu=null;
      if(!this.container)throw new Error('ActionGroup container not found.');
      this.container.classList.add('dkds-action-group','dkds-integrated-action-group','dkds-material-role-control');
      const separatedHeader=this.container.classList.contains('dkds-plugin-header-actions')||spec.integrated===false;
      if(separatedHeader){
        this.container.classList.add('dkds-separated-action-group');
        this.container.classList.remove('dkds-integrated-action-group','dkds-material-role-control');
        this.container.dataset.dkdsActionLayout='separated';
      }else this.container.dataset.dkdsActionLayout='integrated';
      if(spec.className)this.container.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      this.setActions(spec.actions||[]);
    }
    setActions(actions=[]){this.actions=Array.isArray(actions)?actions.slice():[];this.render();return this;}
    update(state={}){this.state={...this.state,...state};this.render();return this;}
    value(value,ctx){return typeof value==='function'?value({...this.state,...ctx}):value;}
    mobileActions(){
      const rows=[];
      for(const action of this.actions.slice().sort((a,b)=>(Number(a.order)||100)-(Number(b.order)||100))){
        const ctx={action,group:this};
        if(action.type==='separator'||this.value(action.visible,ctx)===false)continue;
        const enabled=this.value(action.enabled,ctx)!==false;
        const rawItems=typeof action.items==='function'?action.items({...ctx,state:this.state}):action.items;
        const items=Array.isArray(rawItems)?rawItems.filter(item=>item?.type!=='separator'&&item?.visible!==false).map(item=>({
          id:String(item.id||''),label:String(typeof item.label==='function'?item.label({...ctx,item,state:this.state}):item.label||item.id||''),
          icon:String(item.icon||''),enabled:item.enabled!==false,
          nativeSave:item.nativeSave?String(item.nativeSave==='project'?'project':'export'):'',nativeCopy:item.nativeCopy?'clipboard':''
        })).filter(item=>item.id):[];
        rows.push({id:String(action.id||''),label:String(this.value(action.label,ctx)??action.id??''),icon:String(this.value(action.icon,ctx)||''),enabled,active:!!this.value(action.active,ctx),variant:actionVariant(action),menu:!!action.menu,items,nativeSave:action.nativeSave?String(action.nativeSave==='project'?'project':'export'):'',nativeCopy:action.nativeCopy?'clipboard':''});
      }
      return rows.filter(row=>row.id);
    }
    invokeMobile(actionId,itemId=''){
      const action=this.actions.find(row=>String(row?.id||'')===String(actionId||''));
      if(!action)return false;
      const ctx={action,group:this,state:this.state,event:null,button:null,mobile:true};
      if(this.value(action.visible,{action,group:this})===false||this.value(action.enabled,{action,group:this})===false)return false;
      if(itemId){
        const rawItems=typeof action.items==='function'?action.items(ctx):action.items;
        const item=(Array.isArray(rawItems)?rawItems:[]).find(row=>String(row?.id||'')===String(itemId));
        if(!item||item.type==='separator'||item.visible===false||item.enabled===false)return false;
        (item.onInvoke||item.handler)?.({...ctx,item});return true;
      }
      if(action.menu)return false;
      (action.onInvoke||action.handler)?.(ctx);return true;
    }
    render(){
      this.cleanups.splice(0).forEach(cleanupCall);
      this.container.innerHTML='';
      const ordered=this.actions.slice().sort((a,b)=>(Number(a.order)||100)-(Number(b.order)||100));
      for(const action of ordered){
        const ctx={action,group:this};
        if(this.value(action.visible,ctx)===false)continue;
        if(action.type==='separator'){const sep=document.createElement('span');sep.className='dkds-action-separator';this.container.appendChild(sep);continue;}
        const button=document.createElement('button');
        button.type='button';button.className=`dkds-action-button ${action.className||''}`.trim();button.dataset.actionId=String(action.id||'');
        button.dataset.dkdsComponentIdentity='toolbarAction';button.dataset.dkdsComponentIdentityOwner='core-component';
        if(this.container.dataset.dkdsActionLayout==='separated')button.dataset.dkdsActionLayout='standalone';
        if(action.nativeSave)button.dataset.dkdsNativeSave=String(action.nativeSave==='project'?'project':'export');
        if(action.nativeCopy)button.dataset.dkdsNativeCopy='clipboard';
        const headerIntegrated=this.container.dataset.dkdsActionLayout==='integrated'&&!!this.container.closest?.('.dkds-surface-header,.floating-header,.trend-card-header,.analysis-chart-title,.dkds-plot-view-head,.dkds-group-plot-head,.dkds-portable-header');
        const variant=actionVariant(action)||(headerIntegrated?'quiet':'');if(variant){button.dataset.dkdsComponentVariant=variant;button.dataset.dkdsComponentVariantOwner='core-component';}
        const label=this.value(action.label,ctx)??action.id??'';
        const icon=this.value(action.icon,ctx);
        const active=!!this.value(action.active,ctx);const enabled=this.value(action.enabled,ctx)!==false;
        button.classList.toggle('active',active);if(active)button.setAttribute('aria-pressed','true');else button.removeAttribute('aria-pressed');button.disabled=!enabled;
        const accessible=String(this.value(action.title,ctx)||label||action.id||'').trim();if(accessible)button.setAttribute('aria-label',accessible);
        button.innerHTML=`${icon?`<span class="dkds-action-icon">${esc(icon)}</span>`:''}<span class="dkds-action-label">${esc(label)}</span>${action.menu?'<span class="dkds-action-caret">▾</span>':''}`;
        button.addEventListener('click',event=>{
          if(button.disabled)return;
          const invokeContext={event,action,group:this,state:this.state,button};
          const rawItems=typeof action.items==='function'?action.items(invokeContext):action.items;
          if(action.menu&&Array.isArray(rawItems)){
            if(this.menu?.element&&this.menuActionId===String(action.id||'')){this.menu.dispose();this.menu=null;this.menuActionId='';return;}
            this.menu?.dispose?.();
            const rect=button.getBoundingClientRect();
            this.menuActionId=String(action.id||'');
            this.menu=new ContextMenu(this.owner,{anchor:button,onClose:()=>{this.menu=null;this.menuActionId='';}});
            this.menu.open({x:rect.left,y:rect.bottom+4,items:rawItems,context:invokeContext});
            return;
          }
          (action.onInvoke||action.handler)?.(invokeContext);
        });
        this.container.appendChild(button);
        if(action.shortcut){
          this.cleanups.push(shortcutHub.register(this.owner,`action:${action.id}`,{chord:action.shortcut,activity:action.activity||this.spec.activity,priority:action.priority||0,allowTyping:action.allowTyping,handler:()=>{if(button.disabled||button.offsetParent===null)return false;button.click();return true;}}));
        }
      }
      return this;
    }
    dispose(){this.menu?.dispose?.();this.menu=null;this.menuActionId='';this.cleanups.splice(0).forEach(cleanupCall);this.container?.replaceChildren();}
  }

  class InteractionBinding {
    constructor(owner,target,spec={}){
      this.owner=owner;this.target=resolveElement(target);this.spec=spec;this.cleanups=[];this.drag=null;
      if(!this.target)throw new Error('Interaction target not found.');
      this.bind();
    }
    add(name,fn,opts){this.target.addEventListener(name,fn,opts);this.cleanups.push(()=>this.target.removeEventListener(name,fn,opts));}
    mods(event){return {shift:!!event.shiftKey,ctrl:!!event.ctrlKey||!!event.metaKey,alt:!!event.altKey};}
    bind(){
      const s=this.spec;
      if(s.click)this.add('click',e=>s.click({event:e,mods:this.mods(e),target:this.target}));
      if(s.doubleClick)this.add('dblclick',e=>s.doubleClick({event:e,mods:this.mods(e),target:this.target}));
      if(s.contextMenu)this.add('contextmenu',e=>{if(s.preventContext!==false)e.preventDefault();s.contextMenu({event:e,mods:this.mods(e),target:this.target});});
      if(s.wheel)this.add('wheel',e=>s.wheel({event:e,mods:this.mods(e),target:this.target}),{passive:s.passiveWheel===true});
      if(s.drag){
        this.add('pointerdown',e=>{
          if(e.button!==0&&s.drag.anyButton!==true)return;
          const rect=this.target.getBoundingClientRect();
          this.drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,rect,mods:this.mods(e),moved:false};
          try{this.target.setPointerCapture?.(e.pointerId);}catch{}
          s.drag.start?.({event:e,drag:this.drag,target:this.target});
        });
        this.add('pointermove',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;d.x=e.clientX;d.y=e.clientY;d.dx=d.x-d.sx;d.dy=d.y-d.sy;d.moved=d.moved||Math.hypot(d.dx,d.dy)>=(s.drag.threshold||4);s.drag.move?.({event:e,drag:d,target:this.target});});
        const end=e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;s.drag.end?.({event:e,drag:d,target:this.target});};
        this.add('pointerup',end);this.add('pointercancel',end);
      }
    }
    dispose(){this.cleanups.splice(0).forEach(cleanupCall);}
  }

module.exports=Object.freeze({ContextMenu, ActionGroup, InteractionBinding,dismissAllContextMenus});
