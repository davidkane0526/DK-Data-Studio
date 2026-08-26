  class SeriesRegistry {
    constructor(owner='core'){this.owner=String(owner||'core');this.rows=new Map();this.order=[];}
    stableId(spec={},index=0){const raw=spec?.seriesId??spec?.id??spec?.key??spec?.entityId??spec?.uid??spec?.name??spec?.label??`series-${index+1}`;return String(raw||`series-${index+1}`);}
    register(spec={},index=0){if(typeof spec==='string')spec={id:spec};const id=this.stableId(spec,index);let row=this.rows.get(id);const explicitColor=String(spec?.color||spec?.line?.color||spec?.marker?.color||'');const label=compactSeriesLabel(spec?.label??spec?.legendLabel??spec?.name??spec?.title??id)||id;if(!row){row={id,index:this.order.length,label,color:explicitColor||SERIES_PALETTE[this.order.length%SERIES_PALETTE.length],group:String(spec?.legendGroup??spec?.legendgroup??spec?.group??''),visible:spec?.visible!==false,metadata:{...(spec?.metadata||{})}};this.rows.set(id,row);this.order.push(id);}else{row={...row,label:label||row.label,color:explicitColor||row.color,group:String(spec?.legendGroup??spec?.legendgroup??spec?.group??row.group??''),visible:spec?.visible!==false,metadata:{...(row.metadata||{}),...(spec?.metadata||{})}};this.rows.set(id,row);}return Object.freeze({...row});}
    normalize(series=[]){return (Array.isArray(series)?series:[]).map((spec,index)=>this.register(spec,index));}
    get(id){const row=this.rows.get(String(id||''));return row?Object.freeze({...row}):null;}
    color(id,fallback=''){return this.get(id)?.color||fallback||SERIES_PALETTE[0];}
    label(id,fallback=''){return this.get(id)?.label||compactSeriesLabel(fallback)||String(id||'');}
    setVisible(id,visible=true){const key=String(id||''),row=this.rows.get(key);if(!row)return false;row.visible=visible!==false;this.rows.set(key,row);return row.visible;}
    list(query={}){const rows=this.order.map(id=>this.get(id)).filter(Boolean);if(!query||typeof query!=='object')return rows;return rows.filter(row=>(!query.group||row.group===query.group)&&(query.visible===undefined||row.visible===query.visible));}
    snapshot(){return Object.freeze({owner:this.owner,count:this.rows.size,rows:Object.freeze(this.list()),series:Object.freeze(this.list())});}
    clear(){this.rows.clear();this.order=[];}
  }

  class LegendGroup {
    constructor(scope,id,spec={}){this.scope=scope;this.owner=scope?.owner||'core';this.id=String(id||'legend');this.spec={interaction:'isolate',...spec};this.members=new Map();this.soloId='';this.visibility=new Map();this.listeners=new Set();}
    register(surface,series=[]){const key=surface?.target||surface;if(!key)return()=>{};this.members.set(key,{surface,series:Array.isArray(series)?series:[]});this.notify('register');return()=>{this.members.delete(key);this.notify('unregister');};}
    setSeries(surface,series=[]){const key=surface?.target||surface;const row=this.members.get(key)||{surface};row.series=Array.isArray(series)?series:[];this.members.set(key,row);for(const item of row.series){const id=String(item?.id||item?.seriesId||item?.name||'');if(id&&!this.visibility.has(id))this.visibility.set(id,item?.visible!==false);}this.notify('series');return this.entries();}
    entries(){const map=new Map();for(const member of this.members.values())for(const item of member.series||[]){const id=String(item?.id||item?.seriesId||item?.name||'');if(!id||map.has(id))continue;map.set(id,{...item,id,visible:this.visibility.get(id)!==false});}return [...map.values()];}
    apply(reason='legend-group'){for(const member of this.members.values()){const surface=member.surface;if(surface&&'legendSoloId' in surface){surface.legendSoloId=this.soloId;surface.requestRender?.(reason);}else if(surface?.setLegendSolo)surface.setLegendSolo(this.soloId);}}
    isolate(id=''){const key=String(id||'');this.soloId=this.soloId===key?'':key;this.apply();this.notify('isolate');return this.soloId;}
    setVisible(id,visible=true){const key=String(id||'');if(!key)return false;this.visibility.set(key,visible!==false);if(visible===false&&this.soloId===key)this.soloId='';this.apply('legend-group-visible');this.notify('visible');return this.visibility.get(key);}
    toggle(id){const key=String(id||'');return this.setVisible(key,this.visibility.get(key)===false);}
    showAll(){this.soloId='';for(const entry of this.entries())this.visibility.set(entry.id,true);this.apply('legend-group-show-all');this.notify('show-all');return true;}
    visibleIds(){return this.entries().filter(x=>x.visible!==false&&(this.soloId?x.id===this.soloId:true)).map(x=>x.id);}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.snapshot(),{reason:'subscribe'});return()=>this.listeners.delete(fn);}
    notify(reason){const snapshot=this.snapshot();for(const fn of [...this.listeners])try{fn(snapshot,{reason});}catch(err){console.warn('[DKDS LegendGroup]',err);}}
    snapshot(){return Object.freeze({id:this.id,owner:this.owner,soloId:this.soloId,count:this.entries().length,visibleIds:Object.freeze(this.visibleIds()),entries:Object.freeze(this.entries().map(x=>Object.freeze({...x})))});}
    dispose(){this.members.clear();this.visibility.clear();this.listeners.clear();}
  }

  class ActiveLayoutSolver {
    constructor(scope=null){this.scope=scope;}
    solve(spec={}){const width=Math.max(0,Number(spec.width)||Number(resolveElement(spec.container)?.clientWidth)||0),height=Math.max(0,Number(spec.height)||Number(resolveElement(spec.container)?.clientHeight)||0),count=Math.max(0,Number(spec.count)||0),gap=Math.max(0,Number(spec.gap)||12),minWidth=Math.max(120,Number(spec.minItemWidth)||280),minHeight=Math.max(100,Number(spec.minItemHeight)||220),maxColumns=Math.max(1,Number(spec.maxColumns)||6),preferred=String(spec.columns??'auto');let columns=preferred!=='auto'&&Number.isFinite(Number(preferred))?Math.max(1,Math.min(maxColumns,Math.floor(Number(preferred)))):Math.max(1,Math.min(maxColumns,Math.floor((width+gap)/(minWidth+gap))||1));if(count)columns=Math.min(columns,count);let itemWidth=columns?Math.max(0,(width-gap*Math.max(0,columns-1))/columns):width;while(columns>1&&itemWidth<minWidth){columns-=1;itemWidth=Math.max(0,(width-gap*(columns-1))/columns);}const rows=count?Math.ceil(count/columns):0,itemHeight=Math.max(minHeight,Math.min(Number(spec.maxItemHeight)||420,Number(spec.aspectRatio)>0?itemWidth/Number(spec.aspectRatio):Math.round(itemWidth*.62)));const neededHeight=rows?rows*itemHeight+gap*Math.max(0,rows-1):0;return Object.freeze({width,height,count,columns,rows,gap,itemWidth:Math.round(itemWidth),itemHeight:Math.round(itemHeight),neededHeight,overflowY:height>0&&neededHeight>height,mode:preferred==='auto'?'auto':'fixed'});}
  }


  class ResizeScheduler {
    constructor(scope){this.scope=scope;this.pending=null;this.raf=0;this.dispatching=false;this.disposed=false;this.suspended=false;}
    request(payload={},options={}){
      if(this.disposed)return;
      const emit=options.emit!==false;
      // Never allow a listener handling layout:resize to synchronously create
      // another layout event. Such requests are reduced to a chart-only refresh.
      const effectiveEmit=this.dispatching?false:emit;
      const previous=this.pending||{};
      this.pending={...previous,...payload,_emit:previous._emit===true||effectiveEmit};
      if(this.suspended){window.DKDSPerformance?.skip?.('ui.suspended-resize');return;}
      if(typeof document!=='undefined'&&document.hidden){window.DKDSPerformance?.skip?.('ui.hidden-resize');return;}
      if(this.raf)return;
      const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
      this.raf=raf(()=>this.flush());
    }
    flush(){
      if(this.disposed||this.suspended){this.raf=0;return;}this.raf=0;
      const payload=this.pending||{};this.pending=null;this.dispatching=true;
      try{
        if(payload._emit===true)this.scope.options.events?.emit?.('layout:resize',{pluginId:this.scope.owner,...Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='_emit'))});
      }catch{}finally{this.dispatching=false;}
      for(const chart of this.scope.charts){try{if(!chart?.container||chart.container.offsetParent===null)continue;chart.resize?.();}catch{}}
      if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}
    }
    suspend(){if(this.disposed||this.suspended)return false;this.suspended=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;return true;}
    resume(){if(this.disposed||!this.suspended)return false;this.suspended=false;if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}return true;}
    state(){return {suspended:this.suspended,pending:!!this.pending,scheduled:!!this.raf};}
    dispose(){this.disposed=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;this.pending=null;this.suspended=false;}
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
      const el=document.createElement('div');el.className='dkds-context-menu';el.dataset.owner=this.owner;globalThis.DKDSMaterialSurface?.apply?.(el,'popover');
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
      const hadElement=!!this.element;
      if(this.element){this.element.remove();this.element=null;}
      if(hadElement){try{this.spec.onClose?.();}catch{}}
    }
    dispose(){this.close();}
  }

  class ActionGroup {
    constructor(owner,container,spec={}){
      this.owner=owner;this.container=resolveElement(container);this.spec={...spec};this.actions=[];this.state={};this.cleanups=[];this.menu=null;
      if(!this.container)throw new Error('ActionGroup container not found.');
      this.container.classList.add('dkds-action-group','dkds-integrated-action-group','dkds-material-role-control');
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
          icon:String(item.icon||''),enabled:item.enabled!==false
        })).filter(item=>item.id):[];
        rows.push({id:String(action.id||''),label:String(this.value(action.label,ctx)??action.id??''),icon:String(this.value(action.icon,ctx)||''),enabled,active:!!this.value(action.active,ctx),menu:!!action.menu,items});
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

  const INPUT_GESTURES=Object.freeze(['click','double-click','context','drag','box','wheel','key']);
  const CORE_INTERACTION_INTENTS=Object.freeze(['select','activate','clear-selection','manipulate','select-region','zoom-box','zoom-wheel','pan','context-menu','command','reset-view']);
  function eventModifiers(event){return Object.freeze({ctrl:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey,alt:!!event?.altKey});}
  function normalizeModifiers(value=[]){
    const rows=Array.isArray(value)?value:(value?String(value).split('+'):[]),out=[];
    for(const raw of rows){const key=String(raw||'').trim().toLowerCase();if(['ctrl','control','cmd','command','meta'].includes(key)){if(!out.includes('ctrl'))out.push('ctrl');}else if(key==='shift'){if(!out.includes('shift'))out.push('shift');}else if(['alt','option'].includes(key)){if(!out.includes('alt'))out.push('alt');}}
    return out;
  }
  function buttonName(event,explicit=''){
    if(explicit)return String(explicit);
    const value=Number(event?.button);return value===2?'secondary':value===1?'middle':'primary';
  }

  class InteractionBehaviorProfile {
    constructor(scope,id,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'interaction-behavior');this.spec={...spec};this.bindings=[];this.cleanups=[];this.sequence=0;this.menu=null;this.setBindings(spec.bindings||[]);
    }
    normalizeBinding(spec={}){
      const gesture=String(spec.gesture||'').trim();if(!INPUT_GESTURES.includes(gesture))throw new Error(`Unsupported interaction gesture: ${gesture||'(empty)'}`);
      const target=Array.isArray(spec.target)?spec.target.map(String):(spec.target?[String(spec.target)]:['*']);
      const intent=String(spec.intent||(spec.command?'command':gesture)).trim(),chord=normalizeChord(spec.chord||'');return {...spec,id:String(spec.id||`${this.id}:${gesture}:${++this.sequence}`),gesture,target,modifiers:normalizeModifiers(spec.modifiers),matchModifiers:spec.modifiers!==undefined,priority:Number(spec.priority)||0,button:spec.button?String(spec.button):'',chord,intent,command:spec.command?String(spec.command):''};
    }
    setBindings(rows=[]){this.cleanups.splice(0).forEach(cleanupCall);this.bindings=[];for(const row of Array.isArray(rows)?rows:[])this.add(row);return this;}
    add(spec={}){
      const row=this.normalizeBinding(spec);this.bindings.push(row);let shortcutOff=null;
      if(row.gesture==='key'&&row.chord){shortcutOff=shortcutHub.register(this.owner,`behavior:${row.id}`,{chord:row.chord,activity:row.activity||this.spec.activity,priority:row.priority,allowTyping:row.allowTyping,when:row.whenKey,handler:({event,activity})=>{const result=this.route({gesture:'key',target:'keyboard',event,chord:row.chord,payload:{activity}});return result.handled;}});this.cleanups.push(shortcutOff);}
      return ()=>{const i=this.bindings.indexOf(row);if(i>=0)this.bindings.splice(i,1);if(shortcutOff){const c=this.cleanups.indexOf(shortcutOff);if(c>=0)this.cleanups.splice(c,1);cleanupCall(shortcutOff);shortcutOff=null;}};
    }
    matches(row,input){
      if(row.gesture!==input.gesture)return false;
      const target=String(input.target||'');if(!row.target.includes('*')&&!row.target.includes(target))return false;
      if(row.targetId&&String(row.targetId)!==String(input.targetId||''))return false;
      if(row.button&&row.button!==buttonName(input.event,input.button))return false;
      if(row.gesture==='key'&&row.chord&&normalizeChord(input.chord||eventChord(input.event))!==row.chord)return false;
      const mods=eventModifiers(input.event),wanted=new Set(row.modifiers||[]);
      if(row.matchModifiers&&(wanted.has('ctrl')!==mods.ctrl||wanted.has('shift')!==mods.shift||wanted.has('alt')!==mods.alt))return false;
      if(typeof row.when==='function'){try{if(!row.when({...input,mods,profile:this}))return false;}catch(err){console.warn('[DKDS interaction behavior when]',row.id,err);return false;}}
      return true;
    }
    resolve(input={}){
      const normalized={...input,gesture:String(input.gesture||''),target:String(input.target||'*')};
      const rows=this.bindings.filter(row=>this.matches(row,normalized)).sort((a,b)=>b.priority-a.priority||this.bindings.indexOf(a)-this.bindings.indexOf(b));
      const binding=rows[0]||null;if(!binding)return Object.freeze({handled:false,intent:'',binding:null,input:normalized});
      return {handled:false,intent:String(binding.intent||''),binding,input:normalized};
    }
    commandContext(decision){const input=decision.input||{};return {...(input.payload||{}),gesture:input.gesture,targetKind:input.target,targetId:input.targetId||'',event:input.event,mods:eventModifiers(input.event),intent:decision.intent,bindingId:decision.binding?.id||'',behaviorId:this.id};}
    openContextActions(decision){
      const binding=decision.binding,input=decision.input||{},ctx=this.commandContext(decision);let rows=binding?.contextActions;
      if(typeof rows==='function')rows=rows(ctx);if(!Array.isArray(rows)||!rows.length)return false;
      const items=rows.map(item=>({...item,onInvoke:payload=>{const actionCtx={...ctx,...payload,actionId:item.id};if(item.command)return this.scope.options.commands?.run?.(String(item.command),actionCtx);return item.onInvoke?.(actionCtx);}}));
      const event=input.event,x=Number(event?.clientX)||0,y=Number(event?.clientY)||0;this.menu?.dispose?.();this.menu=new ContextMenu(this.owner);this.menu.open({x,y,items,context:ctx});return true;
    }
    route(input={}){
      const decision=this.resolve(input);if(!decision.binding)return decision;
      const binding=decision.binding,ctx=this.commandContext(decision);let handled=false;
      if(input.gesture==='context'&&binding.contextActions)handled=this.openContextActions(decision)||handled;
      if(binding.command){handled=true;Promise.resolve(this.scope.options.commands?.run?.(binding.command,ctx)).catch(err=>{console.error('[DKDS interaction behavior command]',binding.command,err);this.scope.options.host?.setStatus?.(`交互命令执行失败：${err.message}`);});}
      if(typeof binding.onInvoke==='function'){try{handled=binding.onInvoke(ctx)!==false||handled;}catch(err){console.error('[DKDS interaction behavior]',binding.id,err);}}
      if(typeof this.spec.onIntent==='function'){try{handled=this.spec.onIntent({...ctx,binding,intent:decision.intent})!==false||handled;}catch(err){console.error('[DKDS interaction behavior intent]',this.id,err);}}
      return {...decision,handled};
    }
    bind(target,spec={}){
      const root=resolveElement(target);if(!root)throw new Error(`Interaction behavior target not found: ${this.id}`);
      const requested=Array.isArray(spec.gestures)&&spec.gestures.length?spec.gestures:['click','double-click','context'];
      const eventNames={click:'click','double-click':'dblclick',context:'contextmenu',wheel:'wheel',key:'keydown'};
      const selector=String(spec.selector||'').trim(),cleanups=[];
      const subjectFor=event=>{
        if(!selector)return root;
        const subject=event?.target?.closest?.(selector);return subject&&root.contains(subject)?subject:null;
      };
      const valueFor=(value,context,fallback='')=>typeof value==='function'?value(context):(value??fallback);
      for(const gesture of requested){
        const eventName=eventNames[String(gesture||'')];if(!eventName)continue;
        const listener=event=>{
          const element=subjectFor(event);if(!element)return;
          const base={event,element,root,profile:this};
          const targetKind=String(valueFor(spec.target,base,element.dataset?.interactionTarget||'*')||'*');
          const targetId=String(valueFor(spec.targetId,base,element.dataset?.interactionId||element.dataset?.selectionKey||'')||'');
          const extraPayload=valueFor(spec.payload,base,{})||{};
          const input={gesture:String(gesture),target:targetKind,targetId,event,button:valueFor(spec.button,base,''),payload:{...extraPayload,element,root}};
          try{spec.beforeRoute?.({...base,input});}catch(err){console.warn('[DKDS interaction behavior beforeRoute]',this.id,err);}
          const decision=this.route(input),matched=!!decision.binding;
          const shouldPrevent=spec.preventDefault===true||(String(gesture)==='context'&&(matched||decision.handled));
          if(shouldPrevent)event.preventDefault?.();
          if((decision.handled||spec.stopPropagation===true)&&spec.stopPropagation!==false)event.stopPropagation?.();
          try{spec.onDecision?.({...base,input,decision});}catch(err){console.warn('[DKDS interaction behavior onDecision]',this.id,err);}
        };
        root.addEventListener(eventName,listener,spec.capture===true);cleanups.push(()=>root.removeEventListener(eventName,listener,spec.capture===true));
      }
      const cleanup=()=>cleanups.splice(0).reverse().forEach(cleanupCall);this.cleanups.push(cleanup);return cleanup;
    }
    snapshot(){return Object.freeze({id:this.id,bindings:Object.freeze(this.bindings.map(row=>Object.freeze({id:row.id,gesture:row.gesture,target:Object.freeze(row.target.slice()),modifiers:Object.freeze(row.modifiers.slice()),button:row.button,intent:row.intent,command:row.command,priority:row.priority})))});}
    dispose(){this.menu?.dispose?.();this.menu=null;this.cleanups.splice(0).forEach(cleanupCall);this.bindings=[];}
  }

  function normalizePlacement(value){const p=String(value||'').toLowerCase();return ['home','sticky','left','right','bottom','main','float','global'].includes(p)?p:'home';}
  function refreshDockZoneState(){
    const zones=new Set();
    for(const name of ['left','right','bottom']){const zone=hostState.zones.get(name);if(zone)zones.add(zone);}
    for(const zone of document.querySelectorAll('.dkds-portable-zone'))zones.add(zone);
    for(const zone of zones){
      zone.classList.toggle('active',[...zone.children].some(child=>child.classList?.contains('dkds-portable-view')||child.classList?.contains('dkds-prime-portable')));
    }
  }
