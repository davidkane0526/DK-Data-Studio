'use strict';


  const VERSION = '7.1.0';
  const plotPresentation = window.DKDSPlotPresentation || null;
  const scopes = new Map();
  const hostState = {
    root: null,
    zones: new Map(),
    activity: () => '',
    status: () => {},
    storagePrefix: 'dkds.ui.layout.v6',
    layers: { canvasBase: 1400, globalBase: 2400, canvasSeq: 0, globalSeq: 0 }
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
  // Strict local resolver for reusable view chrome. Unlike resolveElement(), this
  // never falls back to document.querySelector when a selector is absent from
  // its own card/panel. Cross-card fallback caused standard controls from many
  // PlotViews to accumulate in one unrelated chart header.
  const resolveScopedElement = (value, root=document) => {
    if (isElement(value)) return value;
    if (typeof value === 'function') {
      try { return resolveScopedElement(value(), root); } catch { return null; }
    }
    const selector=String(value||'').trim();
    if(!selector||!root?.querySelector)return null;
    try{return root.querySelector(selector);}catch{return null;}
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

module.exports=Object.freeze({VERSION, plotPresentation, scopes, hostState, esc, isElement, resolveElement, resolveScopedElement, isTypingTarget, cleanupCall, readJson, writeJson, normalizeKeyName, eventChord, normalizeChord, ShortcutHub, shortcutHub});
