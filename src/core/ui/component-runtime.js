(() => {
  'use strict';
  if(window.DKDSComponents)return;
  const VERSION='2.3.0';
  const StyleGate=globalThis.DKDSStyleGate;
  if(!StyleGate)throw new Error('DKDSStyleGate must initialize before Component Runtime.');
  const scopes=new Set();
  const lifecycleByElement=new WeakMap();
  const resourceCounts=new Map();
  const hydrationStats={queued:0,coalesced:0,batches:0,roots:0};
  const MOTION_ROLE_BY_IDENTITY=Object.freeze({toolbarAction:'control',tab:'control',menuItem:'control',field:'field'});
  const ACTION_VARIANTS=new Set(['primary','secondary','selected','active','quiet','destructive']);
  const isElement=v=>!!v&&v.nodeType===1;
  const isEventTarget=v=>!!v&&typeof v.addEventListener==='function'&&typeof v.removeEventListener==='function';
  const resolve=(root,value)=>{if(isElement(value)||value===window||value===document||(isEventTarget(value)&&typeof value!=='string'))return value;if(typeof value==='function')return resolve(root,value());const q=String(value||'').trim();if(!q)return root||null;try{return root?.querySelector?.(q)||document.querySelector(q);}catch{return null;}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appendChildren=(parent,children=[])=>{for(const child of children){if(child==null)continue;parent.append(isElement(child)?child:document.createTextNode(String(child)));}return parent;};
  const isPaintAttribute=name=>StyleGate.PAINT_ATTRIBUTES?.includes?.(String(name||'').toLowerCase())===true;
  const isPresentationAttribute=name=>StyleGate.PRESENTATION_ATTRIBUTES?.includes?.(String(name||'').toLowerCase())===true;
  const normalizeSource=value=>String(value||'').trim()||'src/core/ui/component-runtime.js';
  const setAttrs=(el,attrs={},owner='',source='')=>{const provenance=normalizeSource(source);for(const [k,v] of Object.entries(attrs||{})){if(v===undefined||v===null||v===false)continue;if(owner&&isPaintAttribute(k))StyleGate.setPaint(el,k,v===true?'':String(v),{owner,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-paint',source:provenance});else if(owner&&isPresentationAttribute(k))StyleGate.setPresentation(el,k,v===true?'':String(v),{owner,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-presentation',source:provenance});else if(v===true)el.setAttribute(k,'');else el.setAttribute(k,String(v));}return el;};
  const setDataset=(el,dataset={})=>{for(const [k,v] of Object.entries(dataset||{}))if(v!==undefined&&v!==null)el.dataset[k]=String(v);return el;};
  const semantic=(el,identity,variant='',owner='core-component')=>{
    if(identity){
      el.dataset.dkdsComponentIdentity=identity;el.dataset.dkdsComponentIdentityOwner=owner;
      const motionRole=MOTION_ROLE_BY_IDENTITY[identity]||'';
      if(motionRole){el.dataset.dkdsMotionRole=motionRole;el.dataset.dkdsMotionRoleOwner=owner;}
      else if(el.dataset.dkdsMotionRoleOwner===owner){delete el.dataset.dkdsMotionRole;delete el.dataset.dkdsMotionRoleOwner;}
    }
    const value=String(variant||'');
    if(value&&ACTION_VARIANTS.has(value)){el.dataset.dkdsComponentVariant=value;el.dataset.dkdsComponentVariantOwner=owner;}
    else if(owner==='core-component'&&el.dataset.dkdsComponentVariantOwner==='core-component'){delete el.dataset.dkdsComponentVariant;delete el.dataset.dkdsComponentVariantOwner;}
    return el;
  };
  const resourceKey=(owner,kind)=>`${String(owner||'core')}::${String(kind||'resource')}`;
  const adjustResource=(owner,kind,delta)=>{const key=resourceKey(owner,kind),next=Math.max(0,(resourceCounts.get(key)||0)+delta);if(next)resourceCounts.set(key,next);else resourceCounts.delete(key);};
  function trackLifecycle(target,owner='core',kind='lifecycle',detail=''){
    if(!isEventTarget(target))return()=>{};
    const row=Object.freeze({owner:String(owner||'core'),kind:String(kind||'lifecycle'),detail:String(detail||'')});
    let rows=lifecycleByElement.get(target);if(!rows){rows=new Set();lifecycleByElement.set(target,rows);}rows.add(row);adjustResource(row.owner,row.kind,1);let active=true;
    return()=>{if(!active)return false;active=false;rows.delete(row);if(!rows.size)lifecycleByElement.delete(target);adjustResource(row.owner,row.kind,-1);return true;};
  }
  function lifecycleOf(target,{ancestors=true}={}){
    const out=[];let node=target,depth=0;
    while(node){const rows=lifecycleByElement.get(node);if(rows)for(const row of rows)out.push(Object.freeze({...row,depth}));if(!ancestors)break;node=node.parentElement||null;depth++;}
    return Object.freeze(out);
  }
  function trackResource(owner,kind){adjustResource(owner,kind,1);let active=true;return()=>{if(!active)return false;active=false;adjustResource(owner,kind,-1);return true;};}
  function diagnostics(){
    const resources=[...resourceCounts.entries()].map(([key,count])=>{const split=key.indexOf('::');return Object.freeze({owner:key.slice(0,split),kind:key.slice(split+2),count});}).sort((a,b)=>a.owner.localeCompare(b.owner)||a.kind.localeCompare(b.kind));
    return Object.freeze({version:VERSION,activeScopes:scopes.size,scopeOwners:Object.freeze([...new Set([...scopes].map(scope=>scope.owner))].sort()),resources:Object.freeze(resources),hydration:Object.freeze({...hydrationStats,pending:pendingHydration?.size||0})});
  }

  function action(spec={}){
    const button=document.createElement('button');button.type='button';button.className=['dkds-action-button',spec.iconOnly?'dkds-icon-button':'',spec.className||''].filter(Boolean).join(' ');
    semantic(button,'toolbarAction',spec.variant||spec.tone||'');
    if(spec.id)button.id=String(spec.id);
    if(spec.label!==undefined)button.textContent=String(spec.label??'');
    if(spec.html!==undefined)button.innerHTML=String(spec.html??'');
    if(spec.ariaLabel||spec.title)button.setAttribute('aria-label',String(spec.ariaLabel||spec.title));
    if(spec.tooltip)button.dataset.dkdsTooltip=String(spec.tooltip);
    if(spec.selected!==undefined){button.classList.toggle('selected',!!spec.selected);button.setAttribute('aria-selected',String(!!spec.selected));}
    if(spec.active!==undefined){button.classList.toggle('active',!!spec.active);button.setAttribute('aria-pressed',String(!!spec.active));}
    if(spec.disabled!==undefined)button.disabled=!!spec.disabled;
    if(spec.nativeSave)button.dataset.dkdsNativeSave=String(spec.nativeSave==='project'?'project':'export');
    if(spec.nativeCopy)button.dataset.dkdsNativeCopy='clipboard';
    setAttrs(button,spec.attrs);setDataset(button,spec.dataset);
    if(typeof spec.onClick==='function')button.addEventListener('click',spec.onClick);
    return button;
  }

  function actionGroup(spec={}){
    const group=document.createElement(spec.tag||'div');
    group.className=[spec.wrap?'dkds-action-row':'dkds-toolbar',spec.integrated?'dkds-integrated-action-group':'',spec.className||''].filter(Boolean).join(' ');
    if(spec.integrated)group.dataset.dkdsMaterialIntegrated='true';
    if(spec.ariaLabel)group.setAttribute('aria-label',String(spec.ariaLabel));
    appendChildren(group,(spec.actions||[]).map(row=>isElement(row)?row:action(row)));
    return group;
  }

  function tabs(spec={}){
    const root=document.createElement(spec.tag||'div');root.className=['dkds-surface-tabs',spec.className||''].filter(Boolean).join(' ');root.setAttribute('role','tablist');if(spec.ariaLabel)root.setAttribute('aria-label',String(spec.ariaLabel));
    for(const row of spec.items||[]){
      const button=action({...row,className:['dkds-choice-button',row.className||''].filter(Boolean).join(' '),variant:row.variant||''});semantic(button,'tab',row.variant||'');button.setAttribute('role','tab');const selected=!!row.selected;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));button.removeAttribute('aria-pressed');root.appendChild(button);
    }
    return root;
  }

  function surfaceHeader(spec={}){
    const header=document.createElement(spec.tag||'header');header.className=['dkds-surface-header',spec.className||''].filter(Boolean).join(' ');header.dataset.dkdsSurfaceHeader='true';semantic(header,spec.identity||'panelHeader');
    const heading=document.createElement('div');heading.className='dkds-surface-heading';
    const title=document.createElement(spec.titleTag||'strong');title.className='dkds-surface-title';title.textContent=String(spec.title||'');heading.appendChild(title);
    if(spec.meta!==undefined&&spec.meta!==null&&String(spec.meta)!==''){const meta=document.createElement('span');meta.className='dkds-meta';meta.textContent=String(spec.meta);heading.appendChild(meta);}
    if(spec.tooltip)title.dataset.dkdsTooltip=String(spec.tooltip);
    header.appendChild(heading);
    if(spec.tabs){const tabRoot=isElement(spec.tabs)?spec.tabs:tabs(spec.tabs);const actions=document.createElement('div');actions.className='dkds-surface-actions';actions.appendChild(tabRoot);header.appendChild(actions);}
    if(spec.actions){let actions=header.querySelector(':scope > .dkds-surface-actions');if(!actions){actions=document.createElement('div');actions.className='dkds-surface-actions';header.appendChild(actions);}appendChildren(actions,(Array.isArray(spec.actions)?spec.actions:[spec.actions]).map(row=>isElement(row)?row:action(row)));}
    setAttrs(header,spec.attrs);setDataset(header,spec.dataset);return header;
  }

  function field(spec={}){
    const wrap=document.createElement(spec.tag||'label');wrap.className=['dkds-field',spec.className||''].filter(Boolean).join(' ');
    if(spec.label!==undefined){const label=document.createElement('span');label.className='dkds-field-label';label.textContent=String(spec.label??'');wrap.appendChild(label);}
    let control;
    if(spec.kind==='select'){
      control=document.createElement('select');for(const opt of spec.options||[]){const o=document.createElement('option');o.value=String(opt?.value??opt);o.textContent=String(opt?.label??opt?.value??opt);control.appendChild(o);}if(spec.value!==undefined)control.value=String(spec.value??'');
    }else if(spec.kind==='textarea'){
      control=document.createElement('textarea');control.value=String(spec.value??'');
    }else{
      control=document.createElement('input');control.type=spec.inputType||spec.kind||'text';if(spec.value!==undefined)control.value=String(spec.value??'');
    }
    control.classList.add('dkds-field-control');semantic(control,'field');if(spec.id)control.id=String(spec.id);if(spec.name)control.name=String(spec.name);if(spec.placeholder)control.placeholder=String(spec.placeholder);if(spec.disabled!==undefined)control.disabled=!!spec.disabled;setAttrs(control,spec.attrs);setDataset(control,spec.dataset);wrap.appendChild(control);return Object.assign(wrap,{control});
  }

  function hydrate(root=document){
    const base=resolve(document,root)||root;if(!base?.querySelectorAll)return Object.freeze({headers:0,actions:0,fields:0,tabs:0});
    let headers=0,actionsCount=0,fields=0,tabsCount=0;
    const scan=(selector,fn)=>{if(base.matches?.(selector))fn(base);for(const el of base.querySelectorAll(selector))fn(el);};
    scan('.dkds-surface-header,.dkds-plot-view-head,.dkds-group-plot-head,.analysis-chart-title,.trend-card-header,.floating-header',el=>{if(!el.dataset.dkdsComponentIdentity)semantic(el,el.matches('[data-dkds-inspector-header],[data-dkds-surface-kind="inspector"] *')?'inspectorHeader':'panelHeader','','core-runtime');headers++;});
    scan('button:not(.dkds-field-control)',el=>{if(!el.dataset.dkdsComponentIdentity){if(el.closest('[role="menu"]'))semantic(el,'menuItem','','core-runtime');else if(el.getAttribute('role')==='tab'||el.closest('[role="tablist"]'))semantic(el,'tab','','core-runtime');else semantic(el,'toolbarAction','','core-runtime');}actionsCount++;});
    scan('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea,.dkds-field-control',el=>{if(!el.dataset.dkdsComponentIdentity)semantic(el,'field','','core-runtime');fields++;});
    scan('[role="tab"]',()=>tabsCount++);
    scan('.dataset-item,.plugin-manager-card,.trend-card,[data-dkds-motion="interactive-card"]',el=>{if(!el.dataset.dkdsMotionRole){el.dataset.dkdsMotionRole='interactive-card';el.dataset.dkdsMotionRoleOwner='core-runtime';}});
    scan('.dkds-selection-item',el=>{if(!el.dataset.dkdsMotionRole){el.dataset.dkdsMotionRole='selection';el.dataset.dkdsMotionRoleOwner='core-runtime';}});
    /* Component identities are assigned synchronously above. Context/material
       composition is mutation-driven and batched by Semantic UI; do not rescan
       the same subtree synchronously for every DOM helper call. */
    globalThis.DKDSSemanticUI?.schedule?.(base);return Object.freeze({headers,actions:actionsCount,fields,tabs:tabsCount});
  }

  function createScope(owner,{root=document,source=''}={}){
    const id=String(owner||'plugin'),provenance=normalizeSource(source||`plugin:${id}`);const cleanups=new Set();let base=resolve(document,root)||document;let disposed=false;
    const cleanup=fn=>{if(typeof fn==='function')cleanups.add(fn);return()=>{try{fn?.();}finally{cleanups.delete(fn);}};};
    const api={
      version:VERSION,owner:id,source:provenance,
      root(value){if(arguments.length)base=resolve(document,value)||document;return base;},
      query:(selector,from=base)=>resolve(resolve(base,from)||base,selector),
      all:(selector,from=base)=>{const host=resolve(base,from)||base;try{return [...host.querySelectorAll(selector)];}catch{return[];}},
      createNS(namespace,tag,{className='',text='',attrs={}}={}){const el=document.createElementNS(namespace,tag);if(className)el.setAttribute('class',className);if(text!==undefined&&text!=='')el.textContent=String(text);setAttrs(el,attrs,id,provenance);return el;},
      create(tag,{className='',text='',html='',attrs={},dataset={}}={}){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined&&text!=='')el.textContent=String(text);if(html)el.innerHTML=String(html);setAttrs(el,attrs,id,provenance);setDataset(el,dataset);return el;},
      action,
      actionGroup,
      tabs,
      surfaceHeader,
      field,
      hydrate:(rootValue=base)=>hydrate(resolve(base,rootValue)||rootValue),
      html(target,value){const el=resolve(base,target);if(el){el.innerHTML=String(value??'');hydrate(el);}return el;},
      text(target,value){const el=resolve(base,target);if(el)el.textContent=String(value??'');return el;},
      replace(target,...nodes){const el=resolve(base,target);el?.replaceChildren?.(...nodes.filter(Boolean));if(el)hydrate(el);return el;},
      append(target,...nodes){const el=resolve(base,target);for(const node of nodes)if(node!=null)el?.append?.(isElement(node)?node:document.createTextNode(String(node)));if(el)hydrate(el);return el;},
      toggle(target,className,force){const el=resolve(base,target);if(el)el.classList.toggle(className,force);return el;},
      style(target,patch={},meta={}){const el=resolve(base,target),writeSource=normalizeSource(meta?.source||provenance);if(el)for(const [k,v] of Object.entries(patch)){const property=String(k).replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`),token=property.startsWith('--'),kind=token?StyleGate.KINDS.CONFIG_TOKEN:StyleGate.KINDS.RUNTIME_INLINE,scope=token?'plugin-runtime-token':'plugin-runtime-inline';if(v==null||v==='')StyleGate.remove(el,property,{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',kind,scope,source:writeSource});else if(token)StyleGate.setToken(el,property,String(v),{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope,source:writeSource});else StyleGate.set(el,property,String(v),{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',kind,scope,source:writeSource});}return el;},
      token(target,patch={},meta={}){const el=resolve(base,target),writeSource=normalizeSource(meta?.source||provenance);if(el)for(const [k,v] of Object.entries(patch)){const property=String(k).replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`);if(!property.startsWith('--'))throw new Error(`Component runtime token() requires a CSS custom property: ${property}`);if(v==null||v==='')StyleGate.remove(el,property,{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',kind:StyleGate.KINDS.CONFIG_TOKEN,scope:'plugin-runtime-token',source:writeSource});else StyleGate.setToken(el,property,String(v),{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-token',source:writeSource});}return el;},
      attr(target,name,value,meta={}){const el=resolve(base,target),writeSource=normalizeSource(meta?.source||provenance);if(!el)return null;const attrName=String(name||'').toLowerCase();if(value===undefined)return el.getAttribute(name);if(isPaintAttribute(attrName)){if(value===null)StyleGate.removePaint(el,attrName,{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-paint',source:writeSource});else StyleGate.setPaint(el,attrName,String(value),{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-paint',source:writeSource});}else if(isPresentationAttribute(attrName)){if(value===null)StyleGate.removePresentation(el,attrName,{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-presentation',source:writeSource});else StyleGate.setPresentation(el,attrName,String(value),{owner:id,component:el.dataset?.dkdsComponentIdentity||'component-runtime',scope:'plugin-runtime-presentation',source:writeSource});}else if(value===null)el.removeAttribute(name);else el.setAttribute(name,String(value));return el;},
      on(target,event,handler,options){const el=resolve(base,target);if(!el||typeof handler!=='function')return()=>{};el.addEventListener(event,handler,options);const untrack=trackLifecycle(el,id,`event:${event}`);return cleanup(()=>{el.removeEventListener(event,handler,options);untrack();});},
      delegate(target,event,selector,handler,options){return api.on(target,event,e=>{const hit=e.target?.closest?.(selector);if(hit&&(resolve(base,target)?.contains?.(hit)))handler(e,hit);},options);},
      observe(target,callback,{resize=false,mutation=null}={}){const el=resolve(base,target);if(!el)return()=>{};let observer,kind='';if(resize&&window.ResizeObserver){kind='observer:resize';observer=new ResizeObserver(callback);observer.observe(el);}else if(mutation&&window.MutationObserver){kind='observer:mutation';observer=new MutationObserver(records=>{hydrate(el);callback(records);});observer.observe(el,mutation===true?{childList:true,subtree:true}:mutation);}else return()=>{};const untrack=trackLifecycle(el,id,kind);return cleanup(()=>{observer.disconnect();untrack();});},
      frame(fn){let raf=0;const untrack=trackResource(id,'frame');const cancel=()=>{if(raf)cancelAnimationFrame(raf);raf=0;cleanups.delete(cancel);untrack();};cleanups.add(cancel);raf=requestAnimationFrame(()=>{raf=0;cleanups.delete(cancel);untrack();if(!disposed)fn?.();});return cancel;},
      timeout(fn,delay=0){let timer=0;const untrack=trackResource(id,'timer:timeout');const cancel=()=>{if(timer)clearTimeout(timer);timer=0;cleanups.delete(cancel);untrack();};cleanups.add(cancel);timer=setTimeout(()=>{timer=0;cleanups.delete(cancel);untrack();if(!disposed)fn?.();},Math.max(0,Number(delay)||0));return cancel;},
      interval(fn,delay=0){const ms=Math.max(1,Number(delay)||1);let timer=setInterval(()=>{if(!disposed)fn?.();},ms);const untrack=trackResource(id,'timer:interval');const cancel=()=>{if(timer)clearInterval(timer);timer=0;cleanups.delete(cancel);untrack();};cleanups.add(cancel);return cancel;},
      microtask(fn){queueMicrotask(()=>{if(!disposed)fn?.();});},
      mount(container,spec={},context={}){return mount(container,spec,{...context,owner:context?.owner||id,source:context?.source||provenance});},
      options(target,rows=[],{value,label='label',key='value',empty=null}={}){const el=resolve(base,target);if(!el)return null;const html=[];if(empty!==null)html.push(`<option value="">${esc(empty)}</option>`);for(const row of rows){const k=typeof row==='object'?row[key]:row,l=typeof row==='object'?(row[label]??k):row;html.push(`<option value="${esc(k)}">${esc(l)}</option>`);}el.innerHTML=html.join('');if(value!==undefined)el.value=String(value??'');hydrate(el);return el;},
      dispose(){disposed=true;for(const fn of [...cleanups])try{fn();}catch{}cleanups.clear();scopes.delete(api);}
    };
    scopes.add(api);return Object.freeze(api);
  }

  function mount(container,spec={},context={}){
    const host=isElement(container)?container:document.querySelector(container);if(!host)throw new Error('Component mount container not found.');host.replaceChildren();const mountOwner=String(context?.owner||'core.component.mount'),mountSource=normalizeSource(context?.source);
    const build=node=>{
      if(node==null)return document.createTextNode('');if(typeof node==='string'||typeof node==='number')return document.createTextNode(String(node));if(isElement(node))return node;
      const type=String(node.type||'div');
      if(type==='action'||type==='button')return action({...node,onClick:node.action?e=>context.actions?.[node.action]?.({event:e,node,context}):node.onClick});
      if(type==='actionGroup'||type==='toolbar')return actionGroup({...node,actions:(node.actions||node.children||[]).map(child=>child?.type==='action'||child?.type==='button'?{...child,onClick:child.action?e=>context.actions?.[child.action]?.({event:e,node:child,context}):child.onClick}:build(child))});
      if(type==='tabs')return tabs({...node,items:(node.items||node.children||[]).map(child=>({...child,onClick:child.action?e=>context.actions?.[child.action]?.({event:e,node:child,context}):child.onClick}))});
      if(type==='surfaceHeader')return surfaceHeader({...node,actions:(node.actions||[]).map(child=>({...child,onClick:child.action?e=>context.actions?.[child.action]?.({event:e,node:child,context}):child.onClick}))});
      if(type==='field')return field(node);
      const tag=({row:'div',stack:'div',text:'span',select:'select',checkbox:'label',input:'input',slot:'div'}[type]||type);const el=document.createElement(tag);if(node.id)el.id=node.id;el.className=[`dkds-component-${type}`,node.className||''].filter(Boolean).join(' ');
      if(type==='text')el.textContent=String(typeof node.text==='function'?node.text(context):node.text??'');
      else if(type==='input'){el.type=node.inputType||'text';el.value=node.value??'';semantic(el,'field');}
      else if(type==='select'){for(const opt of node.options||[]){const o=document.createElement('option');o.value=String(opt.value??opt);o.textContent=String(opt.label??opt.value??opt);el.appendChild(o);}if(node.value!==undefined)el.value=String(node.value);semantic(el,'field');}
      else if(type==='checkbox'){const input=document.createElement('input');input.type='checkbox';input.checked=!!node.value;const label=document.createElement('span');label.textContent=String(node.label||'');el.append(input,label);}
      setAttrs(el,node.attrs,mountOwner,mountSource);for(const child of node.children||[])el.appendChild(build(child));return el;
    };
    const root=build(spec);host.appendChild(root);hydrate(root);return {element:root,destroy:()=>host.replaceChildren()};
  }

  const api=Object.freeze({VERSION,createScope,mount,escape:esc,action,actionGroup,tabs,surfaceHeader,field,hydrate,trackLifecycle,lifecycleOf,diagnostics});
  window.DKDSComponents=api;
  let domObserverCleanup=null,domHydrateQueued=false;const pendingHydration=new Set();
  const flushHydration=()=>{domHydrateQueued=false;const rows=[...pendingHydration];pendingHydration.clear();hydrationStats.batches++;hydrationStats.roots+=rows.length;for(const node of rows)if(node?.isConnected!==false)hydrate(node);};
  const queueHydration=node=>{
    if(!isElement(node))return;
    for(const pending of pendingHydration){if(pending===node||pending.contains?.(node)){hydrationStats.coalesced++;return;}}
    for(const pending of [...pendingHydration])if(node.contains?.(pending)){pendingHydration.delete(pending);hydrationStats.coalesced++;}
    pendingHydration.add(node);hydrationStats.queued++;if(!domHydrateQueued){domHydrateQueued=true;queueMicrotask(flushHydration);}
  };
  const start=()=>{
    hydrate(document);
    if(domObserverCleanup)return;
    const hub=window.DKDSDOMMutationHub;
    if(!hub?.subscribe)return;
    domObserverCleanup=hub.subscribe('core.components.hydration',records=>{for(const record of records)for(const node of record.addedNodes||[])queueHydration(node);},{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);
})();
