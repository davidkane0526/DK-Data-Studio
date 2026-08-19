(() => {
  if (window.DKDSUI) return;

  const VERSION = '4.0.1';
  const scopes = new Map();
  const hostState = {
    root: null,
    zones: new Map(),
    activity: () => '',
    status: () => {},
    storagePrefix: 'dkds.ui.layout.v5'
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isElement = value => !!value && value.nodeType === 1;
  const resolveElement = (value, root=document) => {
    if (isElement(value)) return value;
    if (typeof value === 'function') {
      try { return resolveElement(value(), root); } catch { return null; }
    }
    const selector = String(value || '').trim();
    if (!selector) return null;
    try { return root.querySelector(selector) || document.querySelector(selector); } catch { return null; }
  };
  const isTypingTarget = target => {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return ['input','textarea','select'].includes(tag) || !!target.isContentEditable;
  };
  const cleanupCall = fn => { try { fn?.(); } catch (err) { console.warn('[DKDS UI cleanup]', err); } };
  const readJson = (key, fallback={}) => {
    try { const value=JSON.parse(localStorage.getItem(key)||'null'); return value && typeof value==='object' ? value : fallback; } catch { return fallback; }
  };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  function normalizeKeyName(key='') {
    const raw=String(key||'');
    const map={ ' ':'Space',Esc:'Escape',Del:'Delete',Left:'ArrowLeft',Right:'ArrowRight',Up:'ArrowUp',Down:'ArrowDown' };
    if(map[raw])return map[raw];
    if(raw.length===1)return raw.toUpperCase();
    return raw;
  }
  function eventChord(event) {
    const parts=[];
    if(event.ctrlKey||event.metaKey)parts.push('Ctrl');
    if(event.altKey)parts.push('Alt');
    if(event.shiftKey)parts.push('Shift');
    const key=normalizeKeyName(event.key);
    if(!['Control','Meta','Alt','Shift'].includes(key))parts.push(key);
    return parts.join('+');
  }
  function normalizeChord(chord='') {
    const parts=String(chord||'').split('+').map(x=>x.trim()).filter(Boolean);
    const mods=[];let key='';
    for(const part of parts){
      const p=part.toLowerCase();
      if(['ctrl','control','cmd','command','meta'].includes(p)){if(!mods.includes('Ctrl'))mods.push('Ctrl');continue;}
      if(p==='alt'||p==='option'){if(!mods.includes('Alt'))mods.push('Alt');continue;}
      if(p==='shift'){if(!mods.includes('Shift'))mods.push('Shift');continue;}
      key=normalizeKeyName(part);
    }
    return [...['Ctrl','Alt','Shift'].filter(x=>mods.includes(x)),key].filter(Boolean).join('+');
  }

  class ShortcutHub {
    constructor(){
      this.rows=[];
      this.bound=this.handle.bind(this);
      window.addEventListener('keydown',this.bound,true);
    }
    register(owner,id,spec={}){
      const row={owner:String(owner||''),id:String(id||spec.id||''),spec:{...spec},seq:Date.now()+Math.random()};
      row.spec.chord=normalizeChord(spec.chord||spec.key||'');
      this.rows.push(row);
      return ()=>{const i=this.rows.indexOf(row);if(i>=0)this.rows.splice(i,1);};
    }
    removeOwner(owner){this.rows=this.rows.filter(row=>row.owner!==owner);}
    handle(event){
      if(!event||event.defaultPrevented)return;
      const active=String(hostState.activity?.()||'');
      const chord=eventChord(event);
      const rows=this.rows.slice().sort((a,b)=>(Number(b.spec.priority)||0)-(Number(a.spec.priority)||0)||a.seq-b.seq);
      for(const row of rows){
        const s=row.spec;
        if(s.activity&&String(s.activity)!==active)continue;
        if(isTypingTarget(event.target)&&!s.allowTyping)continue;
        if(s.visible===false||s.enabled===false)continue;
        if(s.chord&&s.chord!==chord)continue;
        if(typeof s.when==='function'){
          let ok=false;try{ok=!!s.when({event,activity:active,owner:row.owner});}catch(err){console.warn('[DKDS UI shortcut when]',err);}
          if(!ok)continue;
        }
        if(!s.chord&&typeof s.match==='function'){
          let ok=false;try{ok=!!s.match(event,{activityId:active,pluginId:row.owner});}catch(err){console.warn('[DKDS UI shortcut match]',err);}
          if(!ok)continue;
        }
        if(!s.chord&&!s.match)continue;
        try{
          const handled=(s.handler||s.onInvoke)?.({event,activity:active,owner:row.owner})!==false;
          if(handled){event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();return;}
        }catch(err){console.error('[DKDS UI shortcut]',err);hostState.status?.(`快捷键执行失败：${err.message}`);return;}
      }
    }
  }
  const shortcutHub=new ShortcutHub();

  class SelectionChannel {
    constructor(owner,id,initial=null){this.owner=owner;this.id=id;this.value=initial;this.listeners=new Set();}
    get(){return this.value;}
    set(value,meta={}){this.value=value;for(const fn of [...this.listeners]){try{fn(value,meta,this);}catch(err){console.warn('[DKDS selection]',err);}}return value;}
    clear(meta={}){return this.set(null,{reason:'clear',...meta});}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.value,{reason:'subscribe'},this);return()=>this.listeners.delete(fn);}
    dispose(){this.listeners.clear();this.value=null;}
  }

  class ContextMenu {
    constructor(owner,spec={}){
      this.owner=owner;this.spec=spec;this.element=null;
      this.boundOutsidePointer=this.handleOutsidePointer.bind(this);
      this.boundBlur=this.close.bind(this);
    }
    handleOutsidePointer(event){
      // The previous implementation closed on *every* window pointerdown in
      // capture phase. That removed the menu before a menu item's click event
      // could fire, making all ContextMenu-backed controls look dead (TER
      // layout and every portable-view placement menu). Only outside presses
      // may close the menu.
      if(this.element?.contains?.(event?.target))return;
      this.close();
    }
    open({x,y,items=[],context={}}={}){
      this.close();
      const el=document.createElement('div');el.className='dkds-context-menu';el.dataset.owner=this.owner;
      for(const item of items){
        if(typeof item.visible==='function'&&!item.visible(context))continue;if(item.visible===false)continue;
        if(item.type==='separator'){const sep=document.createElement('div');sep.className='dkds-context-separator';el.appendChild(sep);continue;}
        const b=document.createElement('button');b.type='button';b.className='dkds-context-item';b.disabled=typeof item.enabled==='function'?!item.enabled(context):item.enabled===false;
        b.innerHTML=`${item.icon?`<span>${esc(item.icon)}</span>`:''}<span>${esc(typeof item.label==='function'?item.label(context):item.label||item.id||'')}</span>${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}`;
        b.onclick=e=>{e.stopPropagation();if(b.disabled)return;this.close();item.onInvoke?.({...context,event:e,item});};el.appendChild(b);
      }
      if(!el.children.length)return null;
      document.body.appendChild(el);this.element=el;
      const rect=el.getBoundingClientRect();const left=Math.max(6,Math.min(window.innerWidth-rect.width-6,Number(x)||0));const top=Math.max(6,Math.min(window.innerHeight-rect.height-6,Number(y)||0));el.style.left=`${left}px`;el.style.top=`${top}px`;
      queueMicrotask(()=>{window.addEventListener('pointerdown',this.boundOutsidePointer,true);window.addEventListener('blur',this.boundBlur,{once:true});});
      return el;
    }
    close(){
      window.removeEventListener('pointerdown',this.boundOutsidePointer,true);
      window.removeEventListener('blur',this.boundBlur);
      if(this.element){this.element.remove();this.element=null;}
    }
    dispose(){this.close();}
  }

  class ActionGroup {
    constructor(owner,container,spec={}){
      this.owner=owner;this.container=resolveElement(container);this.spec={...spec};this.actions=[];this.state={};this.cleanups=[];this.menu=null;
      if(!this.container)throw new Error('ActionGroup container not found.');
      this.container.classList.add('dkds-action-group');
      if(spec.className)this.container.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      this.setActions(spec.actions||[]);
    }
    setActions(actions=[]){this.actions=Array.isArray(actions)?actions.slice():[];this.render();return this;}
    update(state={}){this.state={...this.state,...state};this.render();return this;}
    value(value,ctx){return typeof value==='function'?value({...this.state,...ctx}):value;}
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
        const label=this.value(action.label,ctx)??action.id??'';
        const icon=this.value(action.icon,ctx);
        const active=!!this.value(action.active,ctx);const enabled=this.value(action.enabled,ctx)!==false;
        button.classList.toggle('active',active);button.disabled=!enabled;
        button.title=String(this.value(action.title,ctx)||'');
        button.innerHTML=`${icon?`<span class="dkds-action-icon">${esc(icon)}</span>`:''}<span class="dkds-action-label">${esc(label)}</span>${action.menu?'<span class="dkds-action-caret">▾</span>':''}`;
        button.addEventListener('click',event=>{
          if(button.disabled)return;
          const invokeContext={event,action,group:this,state:this.state,button};
          const rawItems=typeof action.items==='function'?action.items(invokeContext):action.items;
          if(action.menu&&Array.isArray(rawItems)){
            this.menu?.dispose?.();
            const rect=button.getBoundingClientRect();
            this.menu=new ContextMenu(this.owner);
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
    dispose(){this.menu?.dispose?.();this.menu=null;this.cleanups.splice(0).forEach(cleanupCall);this.container?.replaceChildren();}
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

  function normalizePlacement(value){const p=String(value||'').toLowerCase();return ['home','left','right','bottom','main','float'].includes(p)?p:'home';}
  function refreshDockZoneState(){
    const zones=new Set();
    for(const name of ['left','right','bottom']){const zone=hostState.zones.get(name);if(zone)zones.add(zone);}
    for(const zone of document.querySelectorAll('.dkds-portable-zone'))zones.add(zone);
    for(const zone of zones){
      zone.classList.toggle('active',[...zone.children].some(child=>child.classList?.contains('dkds-portable-view')||child.classList?.contains('dkds-prime-portable')));
    }
  }

  class PortableView {
    constructor(scope,id,node,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id);this.node=resolveElement(node);this.spec={...spec};this.allowed=[...new Set((spec.placements||['home','float','right','bottom']).map(normalizePlacement))];
      this.original={parent:this.node?.parentNode||null,next:this.node?.nextSibling||null};this.wrapper=null;this.dragCleanup=null;this.resizeObserver=null;this.chromeCleanups=[];this.contextMenu=null;
      if(!this.node)throw new Error(`Portable view target not found: ${id}`);
      this.ensureWrapper();
      const saved=this.readState();
      const requested=saved.placement||spec.defaultPlacement||'home';
      this.place(requested,{persist:false,bounds:saved.bounds});
    }
    storageKey(){return `${hostState.storagePrefix}.${this.owner}.${this.id}`;}
    readState(){return readJson(this.storageKey(),{});}
    writeState(extra={}){const prev=this.readState();writeJson(this.storageKey(),{...prev,...extra});}
    ensureWrapper(){
      const useTarget=this.spec.useTargetAsWrapper===true;
      const wrapper=useTarget?this.node:document.createElement('section');
      wrapper.classList.add('dkds-portable-view');wrapper.dataset.portableId=this.id;
      let header=useTarget?resolveElement(this.spec.handle||'.analysis-chart-title',wrapper):null;
      if(!header){header=document.createElement('header');header.className='dkds-portable-header drag-handle';if(useTarget)wrapper.prepend(header);}
      else header.classList.add('dkds-portable-inline-header','drag-handle');
      let title=header.querySelector?.('.dkds-portable-title');
      if(!title&&!useTarget){title=document.createElement('div');title.className='dkds-portable-title';title.textContent=this.spec.title||this.node.getAttribute('aria-label')||this.id;header.appendChild(title);}
      const controls=document.createElement('div');controls.className='dkds-portable-controls dkds-portable-breadcrumb';controls.dataset.dkdsPortableControls=this.id;
      const placementIcons={home:'◫',left:'←',main:'◫',right:'→',bottom:'↓',float:'↗'};
      const placementLongLabels={home:'恢复默认位置',left:'固定到左侧',main:'固定到主区域',right:'固定到右侧',bottom:'固定到底部',float:'悬浮'};
      const placementButton=document.createElement('button');placementButton.type='button';placementButton.className='dkds-portable-placement-trigger';placementButton.title='图表位置';
      const refreshPlacementButton=()=>{const current=normalizePlacement(this.wrapper?.dataset?.placement||'home');placementButton.innerHTML=`<span class="dkds-portable-location-icon">${esc(placementIcons[current]||'◫')}</span><span class="dkds-portable-caret">▾</span>`;placementButton.setAttribute('aria-label',`图表位置：${placementLongLabels[current]||current}`);};
      const menuItems=()=>this.allowed.map(placement=>({id:placement,icon:placementIcons[placement]||'◫',label:placementLongLabels[placement]||placement,enabled:()=>this.wrapper.dataset.placement!==placement,onInvoke:()=>this.place(placement)}));
      const showPlacementMenu=(event)=>{event?.stopPropagation?.();event?.preventDefault?.();this.contextMenu?.dispose?.();const rect=placementButton.getBoundingClientRect();const x=Number.isFinite(event?.clientX)&&event.clientX>0?event.clientX:rect.left;const y=Number.isFinite(event?.clientY)&&event.clientY>0?event.clientY:rect.bottom+4;const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x,y,items:menuItems()});};
      placementButton.addEventListener('click',showPlacementMenu);controls.appendChild(placementButton);
      const controlsHost=resolveElement(this.spec.controlsHost,wrapper)||header;
      if(this.spec.controlsPlacement==='start')controlsHost.prepend(controls);else controlsHost.appendChild(controls);
      this.refreshPlacementButton=refreshPlacementButton;refreshPlacementButton();
      const toggleFloat=e=>{if(e.target.closest('button'))return;e.preventDefault();this.place(this.wrapper.dataset.placement==='float'?'home':'float');};
      const openPlacementMenu=e=>{if(e.target.closest('button'))return;e.preventDefault();this.contextMenu?.dispose?.();const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x:e.clientX,y:e.clientY,items:menuItems()});};
      header.addEventListener('dblclick',toggleFloat);header.addEventListener('contextmenu',openPlacementMenu);
      this.chromeCleanups.push(()=>header.removeEventListener('dblclick',toggleFloat),()=>header.removeEventListener('contextmenu',openPlacementMenu));
      if(!useTarget){wrapper.append(header);this.node.parentNode?.insertBefore(wrapper,this.node);wrapper.appendChild(this.node);}
      this.wrapper=wrapper;this.injectedHeader=useTarget&&!resolveElement(this.spec.handle||'.analysis-chart-title',wrapper)?header:null;this.controls=controls;this.useTargetAsWrapper=useTarget;
      const ro=window.ResizeObserver?new ResizeObserver(()=>this.scope.emitResize?.({id:this.id,reason:'portable-resize'})):null;ro?.observe(wrapper);this.resizeObserver=ro;
    }
    zone(placement){return this.spec.layout?.slot?.(placement)||hostState.zones.get(placement)||null;}
    restoreHome(){
      const {parent,next}=this.original;if(parent?.isConnected){if(next?.parentNode===parent)parent.insertBefore(this.wrapper,next);else parent.appendChild(this.wrapper);return true;}return false;
    }
    place(value,{persist=true,bounds=null}={}){
      let placement=normalizePlacement(value);if(!this.allowed.includes(placement))placement=this.allowed[0]||'home';
      this.wrapper.classList.remove('is-floating','is-docked','dock-left','dock-right','dock-bottom','dock-main');
      this.wrapper.style.removeProperty('left');this.wrapper.style.removeProperty('top');this.wrapper.style.removeProperty('width');this.wrapper.style.removeProperty('height');
      cleanupCall(this.dragCleanup);this.dragCleanup=null;
      if(placement==='home')this.restoreHome();
      else if(placement==='float'){
        const zone=this.zone('overlay')||hostState.root||document.body;zone.appendChild(this.wrapper);this.wrapper.classList.add('is-floating');
        const saved=bounds||this.readState().bounds||{};
        const zoneRect=zone.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
        const rect=this.wrapper.getBoundingClientRect();
        const defaultLeft=Math.max(8,Math.min(Math.max(8,(zoneRect.width||window.innerWidth)-420),(rect.left||zoneRect.left+80)-zoneRect.left));
        const defaultTop=Math.max(8,Math.min(Math.max(8,(zoneRect.height||window.innerHeight)-180),(rect.top||zoneRect.top+60)-zoneRect.top));
        this.wrapper.style.left=`${Number.isFinite(Number(saved.left))?Number(saved.left):defaultLeft}px`;
        this.wrapper.style.top=`${Number.isFinite(Number(saved.top))?Number(saved.top):defaultTop}px`;
        this.wrapper.style.width=`${Number(saved.width)||Math.max(360,Math.min(zoneRect.width||window.innerWidth,rect.width||520))}px`;
        if(Number(saved.height)>160)this.wrapper.style.height=`${Number(saved.height)}px`;
        this.dragCleanup=this.bindFloatDrag();
      }else{
        const zone=this.zone(placement);if(zone)zone.appendChild(this.wrapper);else this.restoreHome();
        this.wrapper.classList.add('is-docked',`dock-${placement}`);
      }
      this.wrapper.dataset.placement=placement;
      this.refreshPlacementButton?.();
      refreshDockZoneState();
      if(persist)this.writeState({placement,bounds:placement==='float'?this.bounds():undefined});
      try{this.spec.onPlacementChanged?.({id:this.id,placement,portable:this,wrapper:this.wrapper});}catch(err){console.warn('[DKDS portable placement]',err);}
      this.scope.emitResize?.({id:this.id,reason:'portable-place',placement});
      return placement;
    }
    bounds(){const r=this.wrapper.getBoundingClientRect();const zone=this.zone('overlay');const z=zone?.getBoundingClientRect?.()||{left:0,top:0};return {left:Math.round(r.left-z.left),top:Math.round(r.top-z.top),width:Math.round(r.width),height:Math.round(r.height)};}
    pin(placement='right'){return this.place(placement);}
    float(){return this.place('float');}
    bindFloatDrag(){
      const head=this.wrapper.querySelector('.drag-handle')||this.wrapper.querySelector('.dkds-portable-header');if(!head)return ()=>{};let state=null;
      const down=e=>{if(e.button!==0||e.target.closest('button'))return;const r=this.wrapper.getBoundingClientRect();state={dx:e.clientX-r.left,dy:e.clientY-r.top};e.preventDefault();};
      const move=e=>{if(!state)return;const zone=this.zone('overlay');const z=zone?.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight};this.wrapper.style.left=`${Math.max(0,Math.min(Math.max(0,z.width-120),e.clientX-state.dx-z.left))}px`;this.wrapper.style.top=`${Math.max(0,Math.min(Math.max(0,z.height-80),e.clientY-state.dy-z.top))}px`;};
      const up=()=>{if(!state)return;state=null;
        const r=this.wrapper.getBoundingClientRect(),snap=Math.max(24,Number(this.spec.snapDistance)||44);
        if(this.spec.snap!==false){
          if(r.left<=snap&&this.allowed.includes('left')){this.place('left');return;}
          if(window.innerWidth-r.right<=snap&&this.allowed.includes('right')){this.place('right');return;}
          if(window.innerHeight-r.bottom<=snap&&this.allowed.includes('bottom')){this.place('bottom');return;}
        }
        this.writeState({placement:'float',bounds:this.bounds()});
      };
      head.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
      return ()=>{head.removeEventListener('mousedown',down);window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
    }
    dispose(){cleanupCall(this.dragCleanup);this.contextMenu?.dispose?.();this.contextMenu=null;this.chromeCleanups.splice(0).forEach(cleanupCall);this.resizeObserver?.disconnect?.();this.restoreHome();this.controls?.remove?.();if(this.useTargetAsWrapper){this.wrapper?.classList?.remove('dkds-portable-view','is-floating','is-docked','dock-left','dock-right','dock-bottom','dock-main');delete this.wrapper?.dataset?.portableId;delete this.wrapper?.dataset?.placement;}else if(this.wrapper?.parentNode){this.wrapper.parentNode.insertBefore(this.node,this.wrapper);this.wrapper.remove();}refreshDockZoneState();}
  }

  class SplitController {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={axis:'x',min:180,max:null,defaultSize:320,...spec};this.container=resolveElement(spec.container);this.handle=resolveElement(spec.handle,this.container||document);this.target=resolveElement(spec.target,this.container||document)||this.container;this.axis=this.spec.axis==='y'?'y':'x';this.cleanups=[];this.drag=null;
      if(!this.container||!this.handle||!this.target)throw new Error('SplitController container/handle/target not found.');
      this.key=`${hostState.storagePrefix}.${scope.owner}.split.${String(spec.id||'default')}`;
      const saved=readJson(this.key,{});this.apply(Number(saved.size)||Number(this.spec.defaultSize)||320,{persist:false});this.bind();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply(this.size,{persist:false}));this.ro.observe(this.container);}
    }
    limits(){const rect=this.container.getBoundingClientRect();const total=this.axis==='x'?rect.width:rect.height;const min=Math.max(0,Number(this.spec.min)||0);const configured=Number(this.spec.max);const max=Number.isFinite(configured)&&configured>0?configured:Math.max(min,total-Math.max(120,Number(this.spec.reserve)||220));return {min,max:Math.max(min,max)};}
    apply(value,{persist=true}={}){const {min,max}=this.limits();const next=Math.round(Math.max(min,Math.min(max,Number(value)||Number(this.spec.defaultSize)||min)));this.size=next;if(this.spec.cssVar)this.container.style.setProperty(this.spec.cssVar,`${next}px`);else if(this.axis==='x')this.target.style.width=`${next}px`;else this.target.style.height=`${next}px`;if(persist)writeJson(this.key,{size:next});this.scope.emitResize?.({reason:'split',id:this.spec.id,size:next});return next;}
    bind(){
      const down=e=>{if(e.button!==0)return;const rect=this.container.getBoundingClientRect();this.drag={start:this.axis==='x'?e.clientX:e.clientY,size:this.size,rect};this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!this.drag)return;const point=this.axis==='x'?e.clientX:e.clientY;const sign=this.spec.reverse?-1:1;this.apply(this.drag.size+(point-this.drag.start)*sign,{persist:false});};
      const up=()=>{if(!this.drag)return;this.drag=null;this.apply(this.size,{persist:true});};
      const reset=e=>{e.preventDefault();this.apply(Number(this.spec.defaultSize)||320);};
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);this.handle.addEventListener('dblclick',reset);
      this.cleanups.push(()=>this.handle.removeEventListener('pointerdown',down),()=>window.removeEventListener('pointermove',move),()=>window.removeEventListener('pointerup',up),()=>this.handle.removeEventListener('dblclick',reset));
    }
    dispose(){this.ro?.disconnect?.();this.cleanups.splice(0).forEach(cleanupCall);}
  }

  class WorkspaceLayout {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.regions=new Map();this.created=[];
      if(!this.root)throw new Error('Workspace root not found.');
      this.root.classList.add('dkds-ui-workspace');
      if(spec.className)this.root.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      const defs=spec.regions||{};
      for(const [name,def] of Object.entries(defs))this.mapRegion(name,def);
    }
    mapRegion(name,definition={}){
      const def=isElement(definition)||typeof definition==='string'||typeof definition==='function'?{target:definition}:definition;
      let el=resolveElement(def.target||def.selector,this.root);
      if(!el&&def.create!==false){el=document.createElement(def.tag||'div');el.className=`dkds-ui-region dkds-ui-region-${name} ${def.className||''}`.trim();el.dataset.region=name;this.root.appendChild(el);this.created.push(el);}
      if(el){el.dataset.dkdsRegion=name;this.regions.set(name,el);if(def.className)el.classList.add(...String(def.className).split(/\s+/).filter(Boolean));}
      return el;
    }
    slot(name){return this.regions.get(name)||hostState.zones.get(name)||null;}
    mount(name,node,{replace=false}={}){const slot=this.slot(name);const el=resolveElement(node)||node;if(!slot||!el)return null;if(replace)slot.replaceChildren();slot.appendChild(el);return el;}
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this});}
    dispose(){for(const el of this.created)el.remove();this.root?.classList.remove('dkds-ui-workspace');this.regions.clear();}
  }

  class ChartSurface {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.plot=null;this.toolbar=null;this.ro=null;this.boundPlotEvents=[];
      if(!this.container)throw new Error('Chart container not found.');
      this.container.classList.add('dkds-chart-surface');
      if(spec.title||spec.actions?.length)this.buildChrome();
      else this.plot=this.container;
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this.container);}
      if(spec.data||spec.layout)this.set(spec);
    }
    buildChrome(){
      const head=document.createElement('div');head.className='dkds-chart-head';const title=document.createElement('strong');title.className='dkds-chart-title';title.textContent=this.spec.title||'';const actions=document.createElement('div');actions.className='dkds-chart-actions';head.append(title,actions);
      const plot=document.createElement('div');plot.className='dkds-chart-plot';this.container.append(head,plot);this.plot=plot;
      if(this.spec.actions?.length)this.toolbar=new ActionGroup(this.scope.owner,actions,{activity:this.spec.activity,actions:this.spec.actions});
    }
    async set(spec={}){
      this.spec={...this.spec,...spec};if(!window.Plotly||!this.plot)return false;
      const config={responsive:true,displaylogo:false,...(this.spec.config||{})};
      await Plotly.react(this.plot,this.spec.data||this.spec.traces||[],{autosize:true,...(this.spec.layout||{})},config);
      this.bindPlotEvents();return true;
    }
    bindPlotEvents(){
      if(!this.plot?.on)return;
      for(const [name,handler] of this.boundPlotEvents)try{this.plot.removeListener?.(name,handler);}catch{}
      this.boundPlotEvents=[];
      const events={plotly_click:'onClick',plotly_doubleclick:'onDoubleClick',plotly_hover:'onHover',plotly_unhover:'onUnhover',plotly_selected:'onSelected',plotly_relayout:'onRelayout'};
      for(const [eventName,key] of Object.entries(events)){const fn=this.spec[key];if(typeof fn!=='function')continue;const handler=payload=>fn(payload,this);this.plot.on(eventName,handler);this.boundPlotEvents.push([eventName,handler]);}
    }
    resize(){try{window.Plotly?.Plots?.resize?.(this.plot);}catch{}}
    portable(id,spec={}){return this.scope.panels.create(id,this.container,{title:this.spec.title||spec.title,...spec});}
    dispose(){this.ro?.disconnect?.();this.toolbar?.dispose?.();try{window.Plotly?.purge?.(this.plot);}catch{}this.boundPlotEvents=[];}
  }

  class ViewHost {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.controller=spec.controller||null;this.cleanup=null;this.unsubscribe=null;this.ro=null;this.mounted=false;
      if(!this.container)throw new Error('ViewHost container not found.');
      this.container.classList.add('dkds-view-host');
      this.mount();
    }
    context(reason='render'){return {scope:this.scope,container:this.container,controller:this.controller,reason,host:hostState};}
    mount(){
      if(this.mounted)return this;this.mounted=true;
      try{const out=this.spec.mount?.(this.context('mount'));if(typeof out==='function')this.cleanup=out;}catch(err){console.error('[DKDS view mount]',err);}
      const source=this.controller?.subscribe?this.controller:(this.spec.store?.subscribe?this.spec.store:null);
      if(source)this.unsubscribe=source.subscribe(()=>this.render('state'));
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}
      this.render('mount');return this;
    }
    render(reason='render'){if(!this.mounted)return;try{this.spec.render?.(this.context(reason));}catch(err){console.error('[DKDS view render]',err);hostState.status?.(`界面渲染失败：${err.message}`);}return this;}
    resize(reason='resize'){if(!this.mounted)return;try{this.spec.resize?.(this.context(reason));}catch(err){console.warn('[DKDS view resize]',err);}return this;}
    setController(controller){cleanupCall(this.unsubscribe);this.unsubscribe=null;this.controller=controller||null;if(this.controller?.subscribe)this.unsubscribe=this.controller.subscribe(()=>this.render('state'));this.render('controller');return this;}
    move(container){const next=resolveElement(container);if(!next||next===this.container)return this;this.ro?.disconnect?.();this.container=next;this.container.classList.add('dkds-view-host');if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}this.render('move');return this;}
    dispose(){if(!this.mounted)return;this.mounted=false;cleanupCall(this.unsubscribe);cleanupCall(this.cleanup);this.ro?.disconnect?.();try{this.spec.unmount?.(this.context('unmount'));}catch(err){console.warn('[DKDS view unmount]',err);}this.container?.classList?.remove('dkds-view-host');}
  }

  class Workbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.views=new Map();this.active='';this.splitter=null;this.split=null;this.portableZones=new Map();
      if(!this.root)throw new Error('Workbench root not found.');
      this.root.classList.add('dkds-workbench');
      if(spec.existing===true){
        this.root.classList.add('dkds-workbench-existing');
        this.layout=new WorkspaceLayout(scope,this.root,{regions:spec.regions||{}});
        this.createPortableZones();
        if(spec.split&&spec.split.enabled!==false)this.mountExistingSplit(spec.split);
        return;
      }
      const showHeader=spec.header!==false,showTabs=spec.tabs!==false;
      this.root.innerHTML=`${showHeader?'<header class="dkds-workbench-header"><div class="dkds-workbench-heading"><h2></h2><div class="dkds-workbench-subtitle"></div></div><div class="dkds-workbench-actions"></div></header>':''}${showTabs?'<div class="dkds-workbench-tabs"></div>':''}<div class="dkds-workbench-grid"><aside class="dkds-workbench-left"></aside><main class="dkds-workbench-main"></main><aside class="dkds-workbench-right"></aside><section class="dkds-workbench-bottom"></section><div class="dkds-workbench-overlay"></div></div>`;
      const h=this.root.querySelector('h2');if(h)h.textContent=spec.title||'';const st=this.root.querySelector('.dkds-workbench-subtitle');if(st)st.textContent=spec.subtitle||'';
      this.layout=new WorkspaceLayout(scope,this.root.querySelector('.dkds-workbench-grid'),{regions:{left:{target:'.dkds-workbench-left'},main:{target:'.dkds-workbench-main'},right:{target:'.dkds-workbench-right'},bottom:{target:'.dkds-workbench-bottom'},overlay:{target:'.dkds-workbench-overlay'}}});
      this.portableLayout=this.layout;
      const actionHost=this.root.querySelector('.dkds-workbench-actions');if(spec.actions&&actionHost)this.actions=new ActionGroup(scope.owner,actionHost,{activity:spec.activity,actions:spec.actions});
      for(const view of spec.views||[])this.registerView(view);
      if(spec.defaultView||this.views.size)this.activate(spec.defaultView||this.views.keys().next().value);
    }
    createPortableZones(){
      const make=(name)=>{const el=document.createElement('div');el.className=`dkds-portable-zone dkds-portable-zone-${name}`;el.dataset.portableZone=name;this.root.appendChild(el);this.portableZones.set(name,el);return el;};
      for(const name of ['left','right','bottom'])make(name);
      const semanticOverlay=this.layout.slot('overlay');
      this.portableLayout={slot:(name)=>name==='overlay'?(semanticOverlay||hostState.zones.get('overlay')||this.root):(this.portableZones.get(name)||this.layout.slot(name)||hostState.zones.get(name)||null)};
      return this.portableLayout;
    }
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this.portableLayout||this.layout});}
    mountExistingSplit(splitSpec={}){
      const left=this.layout.slot(splitSpec.region||'left');const main=this.layout.slot(splitSpec.mainRegion||'main');if(!left||!main)return null;
      this.root.classList.add('dkds-workbench-existing-split');
      const handle=document.createElement('div');handle.className='dkds-workbench-splitter';handle.tabIndex=0;handle.title='拖动调整侧栏宽度；双击恢复默认';
      if(left.nextSibling)this.root.insertBefore(handle,left.nextSibling);else this.root.appendChild(handle);this.splitter=handle;
      this.split=new SplitController(this.scope,{id:splitSpec.id||'workbench-left',container:this.root,handle,target:left,axis:'x',min:splitSpec.min||190,max:splitSpec.max||null,reserve:splitSpec.reserve||360,defaultSize:splitSpec.defaultSize||300});
      return this.split;
    }
    registerView(view={}){const id=String(view.id||'');if(!id)throw new Error('Workbench view id required.');this.views.set(id,{...view,id});this.renderTabs();return this;}
    renderTabs(){const host=this.root.querySelector('.dkds-workbench-tabs');if(!host)return;host.innerHTML='';for(const view of [...this.views.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.dataset.viewId=view.id;b.className='dkds-workbench-tab';b.textContent=view.label||view.title||view.id;b.classList.toggle('active',view.id===this.active);b.onclick=()=>this.activate(view.id);host.appendChild(b);}}
    activate(id){const next=this.views.get(String(id));if(!next)return false;const main=this.layout.slot('main');if(!main)return false;const previous=this.views.get(this.active);try{previous?.unmount?.({workbench:this,scope:this.scope,container:main});}catch(err){console.warn('[DKDS workbench unmount]',err);}this.active=next.id;main.replaceChildren();if(typeof next.mount==='function')next.mount({workbench:this,scope:this.scope,container:main,layout:this.layout});else if(next.html!==undefined)main.innerHTML=typeof next.html==='function'?next.html():String(next.html);this.renderTabs();this.scope.emitResize({reason:'workbench-view',viewId:next.id});return true;}
    dispose(){try{this.views.get(this.active)?.unmount?.({workbench:this,scope:this.scope,container:this.layout.slot('main')});}catch{}this.actions?.dispose?.();this.split?.dispose?.();this.splitter?.remove?.();for(const zone of this.portableZones.values())zone.remove();this.portableZones.clear();this.layout?.dispose?.();if(this.spec.existing===true){this.root.classList.remove('dkds-workbench','dkds-workbench-existing','dkds-workbench-existing-split');}else this.root.replaceChildren();}
  }


  class GridController {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.columns=Math.max(1,Number(spec.columns)||3);this.minItemWidth=Math.max(180,Number(spec.minItemWidth)||320);this.maxColumns=Math.max(this.columns,Number(spec.maxColumns)||6);this.ro=null;
      if(!this.container)throw new Error('GridController container not found.');
      this.container.classList.add('dkds-managed-grid');
      this.apply();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply());this.ro.observe(this.container);}
    }
    responsiveColumns(){
      if(this.spec.responsive===false)return this.columns;
      const width=Math.max(0,this.container.clientWidth||0);
      if(!width)return this.columns;
      return Math.max(1,Math.min(this.columns,this.maxColumns,Math.floor((width+10)/(this.minItemWidth+10))||1));
    }
    apply(){const cols=this.responsiveColumns();this.container.style.setProperty('--dkds-grid-columns',String(cols));this.container.dataset.dkdsGridColumns=String(cols);this.scope.emitResize?.({reason:'grid',columns:cols});return cols;}
    setColumns(value){this.columns=Math.max(1,Math.min(this.maxColumns,Number(value)||1));this.apply();return this.columns;}
    getColumns(){return this.columns;}
    dispose(){this.ro?.disconnect?.();this.container.classList.remove('dkds-managed-grid');this.container.style.removeProperty('--dkds-grid-columns');delete this.container.dataset.dkdsGridColumns;}
  }

  class AnalysisWorkbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.owner=scope.owner;this.root=resolveElement(root);this.spec={...spec};
      this.primary=null;this.primes=new Map();this.subs=new Map();this.activeSub='';this.portables=new Map();this.grids=[];this.closed=false;
      this.resizeObserver=null;this.regionObserver=null;this.leftSplit=null;this.rightSplit=null;this.bottomSplit=null;
      if(!this.root)throw new Error('AnalysisWorkbench root not found.');
      this.root.classList.add('dkds-analysis-workbench-host');
      this.build();
    }
    build(){
      const s=this.spec;
      this.root.innerHTML=`<section class="dkds-analysis-workbench" data-workbench-owner="${esc(this.owner)}">
        <header class="dkds-analysis-header">
          <div class="dkds-analysis-heading"><h2></h2><div class="dkds-analysis-subtitle"></div></div>
          <div class="dkds-analysis-commandbar"></div>
          <button type="button" class="dkds-analysis-close">关闭窗口</button>
        </header>
        <nav class="dkds-analysis-nav" aria-label="分析工作区导航">
          <div class="dkds-analysis-nav-primary"></div><div class="dkds-analysis-nav-prime"></div><div class="dkds-analysis-nav-sub"></div>
        </nav>
        <div class="dkds-analysis-frame">
          <aside class="dkds-analysis-left" data-analysis-slot="left"></aside>
          <div class="dkds-analysis-left-resizer" role="separator" aria-orientation="vertical" title="拖动调整左侧宽度；双击复位"></div>
          <main class="dkds-analysis-main" data-analysis-slot="main">
            <div class="dkds-analysis-primary-host"></div><div class="dkds-analysis-sub-host hidden"></div>
          </main>
          <div class="dkds-analysis-right-resizer" role="separator" aria-orientation="vertical" title="拖动调整右侧宽度；双击复位"></div>
          <aside class="dkds-analysis-right" data-analysis-slot="right"></aside>
          <div class="dkds-analysis-bottom-resizer" role="separator" aria-orientation="horizontal" title="拖动调整底部高度；双击复位"></div>
          <section class="dkds-analysis-bottom" data-analysis-slot="bottom"></section>
          <div class="dkds-analysis-overlay" data-analysis-slot="overlay"></div>
        </div>
        <div class="dkds-analysis-parking" aria-hidden="true"></div>
      </section>`;
      this.shell=this.root.firstElementChild;
      this.slots={
        left:this.shell.querySelector('[data-analysis-slot="left"]'),main:this.shell.querySelector('[data-analysis-slot="main"]'),
        right:this.shell.querySelector('[data-analysis-slot="right"]'),bottom:this.shell.querySelector('[data-analysis-slot="bottom"]'),
        overlay:this.shell.querySelector('[data-analysis-slot="overlay"]'),primary:this.shell.querySelector('.dkds-analysis-primary-host'),
        sub:this.shell.querySelector('.dkds-analysis-sub-host'),parking:this.shell.querySelector('.dkds-analysis-parking')
      };
      const frame=this.shell.querySelector('.dkds-analysis-frame');
      const leftHandle=this.shell.querySelector('.dkds-analysis-left-resizer');
      const rightHandle=this.shell.querySelector('.dkds-analysis-right-resizer');
      const bottomHandle=this.shell.querySelector('.dkds-analysis-bottom-resizer');
      if(s.resizableLeft===false)leftHandle?.remove();else if(frame&&leftHandle){
        this.leftSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-left`,container:frame,handle:leftHandle,target:this.slots.left,cssVar:'--dkds-analysis-left-width',defaultSize:Number(s.leftWidth)||280,min:Number(s.leftMin)||210,reserve:Number(s.leftReserve)||520});
      }
      if(s.resizableRight===false)rightHandle?.remove();else if(frame&&rightHandle){
        this.rightSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-right`,container:frame,handle:rightHandle,target:this.slots.right,cssVar:'--dkds-analysis-right-width',defaultSize:Number(s.rightWidth)||390,min:Number(s.rightMin)||280,reserve:Number(s.rightReserve)||520,reverse:true});
      }
      if(s.resizableBottom===false)bottomHandle?.remove();else if(frame&&bottomHandle){
        this.bottomSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-bottom`,container:frame,handle:bottomHandle,target:this.slots.bottom,cssVar:'--dkds-analysis-bottom-height',axis:'y',defaultSize:Number(s.bottomHeight)||320,min:Number(s.bottomMin)||190,reserve:Number(s.bottomReserve)||260,reverse:true});
      }
      const header=this.shell.querySelector('.dkds-analysis-header');
      if(s.header===false)header?.remove();else if(header){
        header.querySelector('h2').textContent=s.title||'';
        header.querySelector('.dkds-analysis-subtitle').textContent=s.subtitle||'';
        const close=header.querySelector('.dkds-analysis-close');
        if(s.closable===false)close?.remove();else if(close)close.onclick=()=>s.onClose?.();
        const commandHost=header.querySelector('.dkds-analysis-commandbar');
        if(Array.isArray(s.actions)&&s.actions.length&&commandHost)this.actions=new ActionGroup(this.owner,commandHost,{activity:s.activity,actions:s.actions});
        else commandHost?.remove();
      }
      this.syncRegions();
      if(window.MutationObserver){
        this.regionObserver=new MutationObserver(()=>this.syncRegions());
        for(const el of [this.slots.left,this.slots.right,this.slots.bottom])this.regionObserver.observe(el,{childList:true,subtree:false});
      }
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>this.resize('observer'));this.resizeObserver.observe(this.shell);}
    }
    layout(){return {slot:name=>this.slots[String(name)]||null};}
    setTitle(title,subtitle){const h=this.shell.querySelector('h2');if(h)h.textContent=String(title||'');const st=this.shell.querySelector('.dkds-analysis-subtitle');if(st&&subtitle!==undefined)st.textContent=String(subtitle||'');return this;}
    syncRegions(){
      if(!this.shell)return;
      const visibleChildren=el=>[...(el?.children||[])].some(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden'));
      const left=visibleChildren(this.slots.left)&&!this.slots.left.classList.contains('hidden');
      const right=visibleChildren(this.slots.right);const bottom=visibleChildren(this.slots.bottom);
      this.shell.classList.toggle('has-left',left);this.shell.classList.toggle('has-right',right);this.shell.classList.toggle('has-bottom',bottom);
      this.shell.querySelector('.dkds-analysis-left-resizer')?.classList.toggle('active',left);
      this.shell.querySelector('.dkds-analysis-right-resizer')?.classList.toggle('active',right);
      this.shell.querySelector('.dkds-analysis-bottom-resizer')?.classList.toggle('active',bottom);
      return {left,right,bottom};
    }
    park(node){if(node&&this.slots.parking&&!this.slots.parking.contains(node))this.slots.parking.appendChild(node);return node;}
    mountPrimary(spec={}){
      cleanupCall(this.primary?.cleanup);
      this.primary={...spec,id:String(spec.id||'main')};
      const left=this.slots.left,main=this.slots.primary;
      left.replaceChildren();main.replaceChildren();
      if(spec.leftNode){const node=resolveElement(spec.leftNode,this.root)||spec.leftNode;if(node)left.appendChild(node);}
      else if(spec.leftHtml!==undefined)left.innerHTML=typeof spec.leftHtml==='function'?spec.leftHtml():String(spec.leftHtml||'');
      if(spec.mainNode){const node=resolveElement(spec.mainNode,this.root)||spec.mainNode;if(node)main.appendChild(node);}
      else if(spec.mainHtml!==undefined)main.innerHTML=typeof spec.mainHtml==='function'?spec.mainHtml():String(spec.mainHtml||'');
      const ctx={workbench:this,scope:this.scope,slots:this.slots,left,main,root:this.shell};
      const cleanup=spec.mount?.(ctx);if(typeof cleanup==='function')this.primary.cleanup=cleanup;
      this.renderNav();this.syncRegions();this.resize('primary');return this;
    }
    registerSurface(spec={}){
      const role=String(spec.role||'').toLowerCase();
      if(role==='primary')return this.mountPrimary(spec);
      if(role==='prime')return this.registerPrime(spec);
      if(role==='sub')return this.registerSub(spec);
      throw new Error(`Unknown AnalysisWorkbench surface role: ${role||'(empty)'}`);
    }
    compose(spec={}){
      if(spec.primary)this.mountPrimary({...spec.primary,role:'primary'});
      for(const prime of spec.primes||[])this.registerPrime({...prime,role:'prime'});
      for(const sub of spec.subs||[])this.registerSub({...sub,role:'sub'});
      if(spec.openPrime)for(const entry of (Array.isArray(spec.openPrime)?spec.openPrime:[spec.openPrime]))this.openPrime(typeof entry==='string'?entry:entry.id,typeof entry==='string'?undefined:entry.placement);
      if(spec.openSub)this.openSub(typeof spec.openSub==='string'?spec.openSub:spec.openSub.id);
      return this;
    }
    registerPrime(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('PRIME id required.');
      const row={role:'prime',placements:['inline','right','bottom','float'],defaultPlacement:'inline',...spec,id,container:null,portable:null,mounted:false,cleanup:null};
      this.primes.set(id,row);this.renderNav();if(spec.autoOpen===true)this.openPrime(id,spec.defaultPlacement);return row;
    }
    registerSub(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('SUB id required.');
      const row={role:'sub',keepLeft:false,persistent:true,...spec,id,mounted:false,container:null,cleanup:null};this.subs.set(id,row);this.renderNav();return row;
    }
    renderNav(){
      const primaryHost=this.shell.querySelector('.dkds-analysis-nav-primary'),primeHost=this.shell.querySelector('.dkds-analysis-nav-prime'),subHost=this.shell.querySelector('.dkds-analysis-nav-sub');
      primaryHost?.replaceChildren();primeHost?.replaceChildren();subHost?.replaceChildren();
      if(this.primary&&primaryHost){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn';b.classList.toggle('active',!this.activeSub);b.textContent=this.primary.label||'主界面';b.onclick=()=>this.showPrimary();primaryHost.appendChild(b);}
      for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-prime-btn';b.classList.toggle('active',row.mounted);b.textContent=row.label||row.title||row.id;b.title='PRIME：可嵌入、固定或悬浮';b.onclick=()=>this.togglePrime(row.id);primeHost?.appendChild(b);}
      for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-sub-btn';b.classList.toggle('active',this.activeSub===row.id);b.textContent=row.label||row.title||row.id;b.onclick=()=>this.openSub(row.id);subHost?.appendChild(b);}
      const nav=this.shell.querySelector('.dkds-analysis-nav');if(nav)nav.classList.toggle('empty',!(primaryHost?.children.length||primeHost?.children.length||subHost?.children.length));
    }
    primeHome(row){
      if(row.inlineHost){const el=resolveElement(row.inlineHost,this.shell)||resolveElement(row.inlineHost,this.root);if(el)return el;}
      return this.slots.primary;
    }
    resolvePrimeNode(row){
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;return {container,existing:true};}
      container=document.createElement('section');container.className='dkds-analysis-prime-panel';container.dataset.primeId=row.id;
      container.innerHTML=`<div class="dkds-analysis-prime-head"><strong>${esc(row.title||row.label||row.id)}</strong><div class="dkds-analysis-prime-chrome"></div></div><div class="dkds-analysis-prime-body"></div>`;
      return {container,existing:false};
    }
    ensurePrime(row){
      if(row.mounted&&row.container)return row;
      const found=this.resolvePrimeNode(row);const container=found.container;row.existing=found.existing;
      container.classList.remove('dkds-prime-hidden');
      if(!container.isConnected)this.primeHome(row)?.appendChild(container);
      const body=found.existing?container:container.querySelector('.dkds-analysis-prime-body');
      const cleanup=row.mount?.({workbench:this,scope:this.scope,container:body,panel:container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;
      row.container=container;row.mounted=true;
      const allowed=[...new Set((row.placements||['inline','right','bottom','float']).map(x=>x==='inline'?'home':normalizePlacement(x)))];
      const layout={slot:name=>name==='home'?this.primeHome(row):this.slots[name]};
      const onPlacementChanged=info=>{
        try{row.onPlacementChanged?.(info);}catch(err){console.warn('[DKDS PRIME placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('prime-placement');});
      };
      const portableSpec=found.existing?{
        title:row.title||row.label||row.id,useTargetAsWrapper:row.useTargetAsWrapper!==false,
        handle:row.handle||'.analysis-chart-title,.pulse-card-heading,.dc-tool-title,.dkds-analysis-prime-head',controlsHost:row.controlsHost,controlsPlacement:row.controlsPlacement||'start',
        placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,layout,onPlacementChanged
      }:{title:row.title||row.label||row.id,useTargetAsWrapper:true,handle:'.dkds-analysis-prime-head',controlsHost:'.dkds-analysis-prime-chrome',placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,layout,onPlacementChanged};
      row.portable=this.scope.panels.create(`prime:${row.id}`,container,portableSpec);this.syncRegions();return row;
    }
    openPrime(id,placement){const row=this.primes.get(String(id));if(!row)return false;this.ensurePrime(row);row.portable.place(placement==='inline'?'home':(placement||row.defaultPlacement||'inline'));this.renderNav();this.syncRegions();this.resize('prime-open');return true;}
    setPrimePlacement(id,placement){return this.openPrime(id,placement);}
    togglePrime(id){const row=this.primes.get(String(id));if(!row)return false;if(!row.mounted)return this.openPrime(id,row.defaultPlacement);this.closePrime(id);return true;}
    closePrime(id){
      const row=this.primes.get(String(id));if(!row?.mounted)return false;
      row.portable?.dispose?.();row.portable=null;cleanupCall(row.cleanup);row.cleanup=null;
      if(row.container){row.container.classList.add('dkds-prime-hidden');this.park(row.container);}
      row.mounted=false;this.renderNav();this.syncRegions();this.resize('prime-close');return true;
    }
    showPrimary(){
      const active=this.activeSub?this.subs.get(this.activeSub):null;if(active?.container)this.park(active.container);
      this.activeSub='';this.slots.primary.classList.remove('hidden');this.slots.sub.classList.add('hidden');this.slots.sub.replaceChildren();
      this.slots.left.classList.toggle('hidden',this.primary?.showLeft===false);this.renderNav();this.syncRegions();this.resize('primary-show');return true;
    }
    ensureSub(row){
      if(row.container)return row.container;
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;}else{container=document.createElement('section');container.className='dkds-analysis-sub-view';container.dataset.subId=row.id;if(row.html!==undefined)container.innerHTML=typeof row.html==='function'?row.html():String(row.html||'');}
      row.container=container;return container;
    }
    openSub(id){
      const row=this.subs.get(String(id));if(!row)return false;
      if(this.activeSub&&this.activeSub!==row.id){const previous=this.subs.get(this.activeSub);if(previous?.container)this.park(previous.container);if(previous&&previous.persistent===false){cleanupCall(previous.cleanup);previous.cleanup=null;previous.container=null;previous.mounted=false;}}
      this.activeSub=row.id;this.slots.primary.classList.add('hidden');this.slots.sub.classList.remove('hidden');this.slots.left.classList.toggle('hidden',row.keepLeft!==true);this.slots.sub.replaceChildren();
      const container=this.ensureSub(row);this.slots.sub.appendChild(container);
      if(!row.mounted||row.remount===true){cleanupCall(row.cleanup);const cleanup=row.mount?.({workbench:this,scope:this.scope,container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;row.mounted=true;}
      row.onShow?.({workbench:this,scope:this.scope,container,slots:this.slots});this.renderNav();this.syncRegions();this.resize('sub-open');return true;
    }
    portable(id,node,spec={}){
      const userPlacementChanged=spec.onPlacementChanged;
      const value=this.scope.panels.create(id,node,{...spec,layout:this.layout(),onPlacementChanged:info=>{
        try{userPlacementChanged?.(info);}catch(err){console.warn('[DKDS workbench portable placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('portable-placement');});
      }});
      this.portables.set(String(id),value);this.syncRegions();return value;
    }
    grid(container,spec={}){const value=new GridController(this.scope,container,spec);this.grids.push(value);return value;}
    surfaceState(){return {primary:this.primary?.id||'',activeSub:this.activeSub,primes:Object.fromEntries([...this.primes].map(([id,row])=>[id,{open:!!row.mounted,placement:row.portable?.wrapper?.dataset?.placement||''}]))};}
    resize(reason='resize'){this.syncRegions();this.scope.emitResize?.({reason:`analysis-workbench:${reason}`});return this;}
    dispose(){
      if(this.closed)return;this.closed=true;cleanupCall(this.primary?.cleanup);
      for(const row of this.primes.values()){if(row.portable)row.portable.dispose?.();cleanupCall(row.cleanup);}
      for(const row of this.subs.values())cleanupCall(row.cleanup);
      for(const grid of this.grids)grid.dispose?.();for(const portable of this.portables.values())portable.dispose?.();
      this.actions?.dispose?.();this.regionObserver?.disconnect?.();this.resizeObserver?.disconnect?.();this.leftSplit?.dispose?.();this.rightSplit?.dispose?.();this.bottomSplit?.dispose?.();
      this.root.replaceChildren();this.root.classList.remove('dkds-analysis-workbench-host');
    }
  }

  class PluginScope {
    constructor(owner,options={}){
      this.owner=String(owner||'anonymous');this.options=options;this.cleanups=[];this.portables=new Map();this.layouts=[];this.charts=[];this.workbenches=[];
      this.shortcuts={
        register:(id,spec)=>this.track(shortcutHub.register(this.owner,id,spec)),
        add:spec=>this.track(shortcutHub.register(this.owner,spec?.id||`shortcut-${this.cleanups.length}`,spec||{})),
        chord:normalizeChord
      };
      this.actions={mount:(container,spec)=>this.trackObject(new ActionGroup(this.owner,container,spec))};
      this.interactions={bind:(target,spec)=>this.trackObject(new InteractionBinding(this.owner,target,spec))};
      this.menus={create:spec=>this.trackObject(new ContextMenu(this.owner,spec)),open:(spec={})=>{const menu=this.trackObject(new ContextMenu(this.owner,spec));menu.open(spec);return menu;}};
      this.selectionChannels=new Map();
      this.selection={channel:(id,initial=null)=>{const key=String(id);if(!this.selectionChannels.has(key))this.selectionChannels.set(key,this.trackObject(new SelectionChannel(this.owner,key,initial)));return this.selectionChannels.get(key);}};
      this.layout={create:(root,spec)=>{const obj=new WorkspaceLayout(this,root,spec);this.layouts.push(obj);return this.trackObject(obj);},split:spec=>this.trackObject(new SplitController(this,spec))};
      this.panels={create:(id,node,spec={})=>{const obj=new PortableView(this,id,node,spec);this.portables.set(String(id),obj);return this.trackObject(obj);},get:id=>this.portables.get(String(id))||null};
      this.chartsApi={mount:(container,spec)=>{const obj=new ChartSurface(this,container,spec);this.charts.push(obj);return this.trackObject(obj);}};
      this.views={mount:(container,spec)=>this.trackObject(new ViewHost(this,container,spec))};
      this.workbench={create:(root,spec)=>{const obj=new Workbench(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);}};
      this.analysisWorkbench={create:(root,spec)=>{const obj=new AnalysisWorkbench(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);}};
      this.grid={create:(container,spec)=>this.trackObject(new GridController(this,container,spec))};
    }
    track(cleanup){if(typeof cleanup==='function')this.cleanups.push(cleanup);return cleanup;}
    trackObject(obj){if(obj?.dispose)this.cleanups.push(()=>obj.dispose());return obj;}
    emitResize(payload={}){try{this.options.events?.emit?.('layout:resize',{pluginId:this.owner,...payload});}catch{}requestAnimationFrame(()=>{for(const chart of this.charts)chart.resize?.();});}
    dispose(){const rows=this.cleanups.splice(0).reverse();rows.forEach(cleanupCall);shortcutHub.removeOwner(this.owner);this.portables.clear();this.selectionChannels.clear();this.layouts=[];this.charts=[];this.workbenches=[];}
  }

  function configureHost(options={}){
    if(options.root!==undefined)hostState.root=resolveElement(options.root)||hostState.root;
    if(typeof options.activity==='function')hostState.activity=options.activity;
    if(typeof options.status==='function')hostState.status=options.status;
    if(options.storagePrefix)hostState.storagePrefix=String(options.storagePrefix);
    if(options.zones&&typeof options.zones==='object'){
      for(const [name,target] of Object.entries(options.zones)){const el=resolveElement(target);if(el)hostState.zones.set(name,el);}
    }
    if(!hostState.zones.has('overlay')&&hostState.root)hostState.zones.set('overlay',hostState.root);
    return api.host.snapshot();
  }

  function createScope(owner,options={}){
    const id=String(owner||'anonymous');
    const scope=new PluginScope(id,options);
    if(!scopes.has(id))scopes.set(id,new Set());
    scopes.get(id).add(scope);
    scope.track(()=>{scopes.get(id)?.delete(scope);if(!scopes.get(id)?.size)scopes.delete(id);});
    return scope;
  }

  const api={
    version:VERSION,
    host:{
      configure:configureHost,
      zone:name=>hostState.zones.get(String(name))||null,
      snapshot:()=>({root:hostState.root,zones:Object.fromEntries([...hostState.zones].map(([k,v])=>[k,v])),activity:hostState.activity?.()||''})
    },
    shortcuts:{register:(owner,id,spec)=>shortcutHub.register(owner,id,spec),normalizeChord,eventChord},
    createScope,
    disposeOwner(owner){for(const scope of [...(scopes.get(String(owner))||[])])scope.dispose();shortcutHub.removeOwner(String(owner));},
    ActionGroup,InteractionBinding,SelectionChannel,ContextMenu,SplitController,WorkspaceLayout,PortableView,ChartSurface,ViewHost,Workbench,GridController,AnalysisWorkbench,
    util:{resolveElement,isTypingTarget,esc}
  };
  window.DKDSUI=Object.freeze(api);
})();
