(() => {
  if(window.DKDSComponents)return;
  const VERSION='1.0.0';
  const scopes=new Map();
  const isElement=v=>!!v&&v.nodeType===1;
  const resolve=(root,value)=>{if(isElement(value))return value;if(typeof value==='function')return resolve(root,value());const q=String(value||'').trim();if(!q)return root||null;try{return root?.querySelector?.(q)||document.querySelector(q);}catch{return null;}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function createScope(owner,{root=document}={}){
    const id=String(owner||'plugin');const cleanups=new Set();let base=resolve(document,root)||document;let disposed=false;
    const cleanup=fn=>{if(typeof fn==='function')cleanups.add(fn);return()=>{try{fn?.();}finally{cleanups.delete(fn);}};};
    const api={
      version:VERSION,owner:id,
      root(value){if(arguments.length)base=resolve(document,value)||document;return base;},
      query:(selector,from=base)=>resolve(resolve(base,from)||base,selector),
      all:(selector,from=base)=>{const host=resolve(base,from)||base;try{return [...host.querySelectorAll(selector)];}catch{return[];}},
      createNS(namespace,tag,{className='',text='',attrs={}}={}){const el=document.createElementNS(namespace,tag);if(className)el.setAttribute('class',className);if(text!==undefined&&text!=='')el.textContent=String(text);for(const [k,v] of Object.entries(attrs||{}))if(v!==undefined&&v!==null)el.setAttribute(k,String(v));return el;},
      create(tag,{className='',text='',html='',attrs={},dataset={}}={}){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined&&text!=='')el.textContent=String(text);if(html)el.innerHTML=String(html);for(const [k,v] of Object.entries(attrs||{}))if(v!==undefined&&v!==null)el.setAttribute(k,String(v));for(const [k,v] of Object.entries(dataset||{}))el.dataset[k]=String(v);return el;},
      html(target,value){const el=resolve(base,target);if(el)el.innerHTML=String(value??'');return el;},
      text(target,value){const el=resolve(base,target);if(el)el.textContent=String(value??'');return el;},
      replace(target,...nodes){const el=resolve(base,target);el?.replaceChildren?.(...nodes.filter(Boolean));return el;},
      append(target,...nodes){const el=resolve(base,target);for(const node of nodes)if(node!=null)el?.append?.(isElement(node)?node:document.createTextNode(String(node)));return el;},
      toggle(target,className,force){const el=resolve(base,target);if(el)el.classList.toggle(className,force);return el;},
      style(target,patch={}){const el=resolve(base,target);if(el)for(const [k,v] of Object.entries(patch))el.style[k]=v==null?'':String(v);return el;},
      attr(target,name,value){const el=resolve(base,target);if(!el)return null;if(value===undefined)return el.getAttribute(name);if(value===null)el.removeAttribute(name);else el.setAttribute(name,String(value));return el;},
      on(target,event,handler,options){const el=resolve(base,target);if(!el||typeof handler!=='function')return()=>{};el.addEventListener(event,handler,options);return cleanup(()=>el.removeEventListener(event,handler,options));},
      delegate(target,event,selector,handler,options){return api.on(target,event,e=>{const hit=e.target?.closest?.(selector);if(hit&&(resolve(base,target)?.contains?.(hit)))handler(e,hit);},options);},
      observe(target,callback,{resize=false,mutation=null}={}){const el=resolve(base,target);if(!el)return()=>{};let observer;if(resize&&window.ResizeObserver){observer=new ResizeObserver(callback);observer.observe(el);}else if(mutation&&window.MutationObserver){observer=new MutationObserver(callback);observer.observe(el,mutation===true?{childList:true,subtree:true}:mutation);}else return()=>{};return cleanup(()=>observer.disconnect());},
      frame(fn){let raf=0;const cancel=()=>{if(raf)cancelAnimationFrame(raf);raf=0;cleanups.delete(cancel);};cleanups.add(cancel);raf=requestAnimationFrame(()=>{raf=0;cleanups.delete(cancel);if(!disposed)fn?.();});return cancel;},
      timeout(fn,delay=0){let timer=0;const cancel=()=>{if(timer)clearTimeout(timer);timer=0;cleanups.delete(cancel);};cleanups.add(cancel);timer=setTimeout(()=>{timer=0;cleanups.delete(cancel);if(!disposed)fn?.();},Math.max(0,Number(delay)||0));return cancel;},
      interval(fn,delay=0){const ms=Math.max(1,Number(delay)||1);let timer=setInterval(()=>{if(!disposed)fn?.();},ms);const cancel=()=>{if(timer)clearInterval(timer);timer=0;cleanups.delete(cancel);};cleanups.add(cancel);return cancel;},
      microtask(fn){queueMicrotask(()=>{if(!disposed)fn?.();});},
      options(target,rows=[],{value,label='label',key='value',empty=null}={}){const el=resolve(base,target);if(!el)return null;const html=[];if(empty!==null)html.push(`<option value="">${esc(empty)}</option>`);for(const row of rows){const k=typeof row==='object'?row[key]:row,l=typeof row==='object'?(row[label]??k):row;html.push(`<option value="${esc(k)}">${esc(l)}</option>`);}el.innerHTML=html.join('');if(value!==undefined)el.value=String(value??'');return el;},
      dispose(){disposed=true;for(const fn of [...cleanups])try{fn();}catch{}cleanups.clear();scopes.delete(id);}
    };
    scopes.set(id,api);return Object.freeze(api);
  }

  function mount(container,spec={},context={}){
    const host=isElement(container)?container:document.querySelector(container);if(!host)throw new Error('Component mount container not found.');
    host.replaceChildren();
    const build=node=>{
      if(node==null)return document.createTextNode('');if(typeof node==='string'||typeof node==='number')return document.createTextNode(String(node));
      if(isElement(node))return node;
      const type=String(node.type||'div');const tag=({row:'div',stack:'div',toolbar:'div',text:'span',button:'button',select:'select',checkbox:'label',input:'input',slot:'div'}[type]||type);
      const el=document.createElement(tag);if(node.id)el.id=node.id;el.className=[`dkds-component-${type}`,node.className||''].filter(Boolean).join(' ');
      if(type==='button'){el.type='button';el.textContent=String(node.label||node.text||'');if(node.action)el.addEventListener('click',e=>context.actions?.[node.action]?.({event:e,node,context}));}
      else if(type==='text')el.textContent=String(typeof node.text==='function'?node.text(context):node.text??'');
      else if(type==='input'){el.type=node.inputType||'text';el.value=node.value??'';}
      else if(type==='select'){for(const opt of node.options||[]){const o=document.createElement('option');o.value=String(opt.value??opt);o.textContent=String(opt.label??opt.value??opt);el.appendChild(o);}if(node.value!==undefined)el.value=String(node.value);}
      else if(type==='checkbox'){const input=document.createElement('input');input.type='checkbox';input.checked=!!node.value;const label=document.createElement('span');label.textContent=String(node.label||'');el.append(input,label);}
      if(node.attrs)for(const [k,v] of Object.entries(node.attrs))if(v!=null)el.setAttribute(k,String(v));
      for(const child of node.children||[])el.appendChild(build(child));return el;
    };
    const root=build(spec);host.appendChild(root);return {element:root,destroy:()=>host.replaceChildren()};
  }
  window.DKDSComponents=Object.freeze({VERSION,createScope,mount,escape:esc});
})();
