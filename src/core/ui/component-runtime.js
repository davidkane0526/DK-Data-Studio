(() => {
  'use strict';
  if(window.DKDSComponents)return;
  const VERSION='2.0.0';
  const scopes=new Map();
  const ACTION_VARIANTS=new Set(['primary','secondary','selected','active','quiet','destructive']);
  const isElement=v=>!!v&&v.nodeType===1;
  const isEventTarget=v=>!!v&&typeof v.addEventListener==='function'&&typeof v.removeEventListener==='function';
  const resolve=(root,value)=>{if(isElement(value)||value===window||value===document||(isEventTarget(value)&&typeof value!=='string'))return value;if(typeof value==='function')return resolve(root,value());const q=String(value||'').trim();if(!q)return root||null;try{return root?.querySelector?.(q)||document.querySelector(q);}catch{return null;}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appendChildren=(parent,children=[])=>{for(const child of children){if(child==null)continue;parent.append(isElement(child)?child:document.createTextNode(String(child)));}return parent;};
  const setAttrs=(el,attrs={})=>{for(const [k,v] of Object.entries(attrs||{})){if(v===undefined||v===null||v===false)continue;if(v===true)el.setAttribute(k,'');else el.setAttribute(k,String(v));}return el;};
  const setDataset=(el,dataset={})=>{for(const [k,v] of Object.entries(dataset||{}))if(v!==undefined&&v!==null)el.dataset[k]=String(v);return el;};
  const semantic=(el,identity,variant='')=>{if(identity)el.dataset.dkdsComponentIdentity=identity;if(variant&&ACTION_VARIANTS.has(String(variant)))el.dataset.dkdsComponentVariant=String(variant);return el;};

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
      const button=action({...row,className:['dkds-choice-button',row.className||''].filter(Boolean).join(' '),variant:row.variant||'selected'});button.dataset.dkdsComponentIdentity='tab';button.setAttribute('role','tab');const selected=!!row.selected;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));button.removeAttribute('aria-pressed');root.appendChild(button);
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
    scan('.dkds-surface-header,.dkds-plot-view-head,.dkds-group-plot-head,.analysis-chart-title,.trend-card-header,.floating-header',el=>{if(!el.dataset.dkdsComponentIdentity)semantic(el,el.matches('[data-dkds-inspector-header],[data-dkds-surface-kind="inspector"] *')?'inspectorHeader':'panelHeader');headers++;});
    scan('button',el=>{if(el.closest('[role="menu"]'))semantic(el,'menuItem');else if(el.getAttribute('role')==='tab'||el.closest('[role="tablist"]'))semantic(el,'tab');else if(!el.dataset.dkdsComponentIdentity)semantic(el,'toolbarAction');actionsCount++;});
    scan('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea,.dkds-field-control',el=>{if(!el.dataset.dkdsComponentIdentity)semantic(el,'field');fields++;});
    scan('[role="tab"]',()=>tabsCount++);
    globalThis.DKDSSemanticUI?.assign?.(base);return Object.freeze({headers,actions:actionsCount,fields,tabs:tabsCount});
  }

  function createScope(owner,{root=document}={}){
    const id=String(owner||'plugin');const cleanups=new Set();let base=resolve(document,root)||document;let disposed=false;
    const cleanup=fn=>{if(typeof fn==='function')cleanups.add(fn);return()=>{try{fn?.();}finally{cleanups.delete(fn);}};};
    const api={
      version:VERSION,owner:id,
      root(value){if(arguments.length)base=resolve(document,value)||document;return base;},
      query:(selector,from=base)=>resolve(resolve(base,from)||base,selector),
      all:(selector,from=base)=>{const host=resolve(base,from)||base;try{return [...host.querySelectorAll(selector)];}catch{return[];}},
      createNS(namespace,tag,{className='',text='',attrs={}}={}){const el=document.createElementNS(namespace,tag);if(className)el.setAttribute('class',className);if(text!==undefined&&text!=='')el.textContent=String(text);setAttrs(el,attrs);return el;},
      create(tag,{className='',text='',html='',attrs={},dataset={}}={}){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined&&text!=='')el.textContent=String(text);if(html)el.innerHTML=String(html);setAttrs(el,attrs);setDataset(el,dataset);return el;},
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
      style(target,patch={}){const el=resolve(base,target);if(el)for(const [k,v] of Object.entries(patch))el.style[k]=v==null?'':String(v);return el;},
      attr(target,name,value){const el=resolve(base,target);if(!el)return null;if(value===undefined)return el.getAttribute(name);if(value===null)el.removeAttribute(name);else el.setAttribute(name,String(value));return el;},
      on(target,event,handler,options){const el=resolve(base,target);if(!el||typeof handler!=='function')return()=>{};el.addEventListener(event,handler,options);return cleanup(()=>el.removeEventListener(event,handler,options));},
      delegate(target,event,selector,handler,options){return api.on(target,event,e=>{const hit=e.target?.closest?.(selector);if(hit&&(resolve(base,target)?.contains?.(hit)))handler(e,hit);},options);},
      observe(target,callback,{resize=false,mutation=null}={}){const el=resolve(base,target);if(!el)return()=>{};let observer;if(resize&&window.ResizeObserver){observer=new ResizeObserver(callback);observer.observe(el);}else if(mutation&&window.MutationObserver){observer=new MutationObserver(records=>{hydrate(el);callback(records);});observer.observe(el,mutation===true?{childList:true,subtree:true}:mutation);}else return()=>{};return cleanup(()=>observer.disconnect());},
      frame(fn){let raf=0;const cancel=()=>{if(raf)cancelAnimationFrame(raf);raf=0;cleanups.delete(cancel);};cleanups.add(cancel);raf=requestAnimationFrame(()=>{raf=0;cleanups.delete(cancel);if(!disposed)fn?.();});return cancel;},
      timeout(fn,delay=0){let timer=0;const cancel=()=>{if(timer)clearTimeout(timer);timer=0;cleanups.delete(cancel);};cleanups.add(cancel);timer=setTimeout(()=>{timer=0;cleanups.delete(cancel);if(!disposed)fn?.();},Math.max(0,Number(delay)||0));return cancel;},
      interval(fn,delay=0){const ms=Math.max(1,Number(delay)||1);let timer=setInterval(()=>{if(!disposed)fn?.();},ms);const cancel=()=>{if(timer)clearInterval(timer);timer=0;cleanups.delete(cancel);};cleanups.add(cancel);return cancel;},
      microtask(fn){queueMicrotask(()=>{if(!disposed)fn?.();});},
      options(target,rows=[],{value,label='label',key='value',empty=null}={}){const el=resolve(base,target);if(!el)return null;const html=[];if(empty!==null)html.push(`<option value="">${esc(empty)}</option>`);for(const row of rows){const k=typeof row==='object'?row[key]:row,l=typeof row==='object'?(row[label]??k):row;html.push(`<option value="${esc(k)}">${esc(l)}</option>`);}el.innerHTML=html.join('');if(value!==undefined)el.value=String(value??'');hydrate(el);return el;},
      dispose(){disposed=true;for(const fn of [...cleanups])try{fn();}catch{}cleanups.clear();scopes.delete(id);}
    };
    scopes.set(id,api);return Object.freeze(api);
  }

  function mount(container,spec={},context={}){
    const host=isElement(container)?container:document.querySelector(container);if(!host)throw new Error('Component mount container not found.');host.replaceChildren();
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
      setAttrs(el,node.attrs);for(const child of node.children||[])el.appendChild(build(child));return el;
    };
    const root=build(spec);host.appendChild(root);hydrate(root);return {element:root,destroy:()=>host.replaceChildren()};
  }

  const api=Object.freeze({VERSION,createScope,mount,escape:esc,action,actionGroup,tabs,surfaceHeader,field,hydrate});
  window.DKDSComponents=api;
  let domObserver=null,domHydrateQueued=false;const pendingHydration=new Set();
  const flushHydration=()=>{domHydrateQueued=false;const rows=[...pendingHydration];pendingHydration.clear();for(const node of rows)if(node?.isConnected!==false)hydrate(node);};
  const queueHydration=node=>{if(!isElement(node))return;pendingHydration.add(node);if(!domHydrateQueued){domHydrateQueued=true;queueMicrotask(flushHydration);}};
  const start=()=>{hydrate(document);if(!window.MutationObserver||domObserver)return;const root=document.documentElement||document.body;if(!root)return;domObserver=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes||[])queueHydration(node);});domObserver.observe(root,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);
})();
