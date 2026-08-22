(() => {
  'use strict';
  const STORAGE_KEY='dkds.appearance.v1';
  const CHANNEL_NAME='dkds-appearance-v1';
  const VALID=new Set(['light','dark']);
  const native=window.electronAPI||null;
  let channel=null;
  let nativeOff=null;

  const systemTheme=()=>{
    try{return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light';}
    catch{return 'light';}
  };
  const savedTheme=()=>{
    try{const value=String(localStorage.getItem(STORAGE_KEY)||'').trim().toLowerCase();return VALID.has(value)?value:'';}
    catch{return '';}
  };
  let current=savedTheme()||systemTheme();

  function apply(theme,{persist=false,emit=true,broadcast=false,nativeSync=false}={}){
    const normalized=String(theme||'').toLowerCase();
    const next=VALID.has(normalized)?normalized:systemTheme();
    const previous=current;
    current=next;
    const root=document.documentElement;
    if(root){root.dataset.dkdsTheme=next;root.style.colorScheme=next;}
    if(persist){try{localStorage.setItem(STORAGE_KEY,next);}catch{}}
    if(broadcast){try{channel?.postMessage?.({theme:next});}catch{}}
    if(nativeSync){try{void native?.appearanceSetTheme?.(next);}catch{}}
    if(emit&&previous!==next){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:next,previous}}));}catch{}}
    return next;
  }
  function set(theme){return apply(theme,{persist:true,emit:true,broadcast:true,nativeSync:true});}
  function toggle(){return set(current==='dark'?'light':'dark');}

  apply(current,{persist:false,emit:false});
  try{
    if(typeof BroadcastChannel==='function'){
      channel=new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message',event=>{const next=String(event?.data?.theme||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true});});
    }
  }catch{}
  try{globalThis.addEventListener?.('storage',event=>{if(event?.key===STORAGE_KEY){const next=String(event.newValue||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:false,emit:true});}});}catch{}
  try{
    if(typeof native?.onAppearanceThemeChanged==='function')nativeOff=native.onAppearanceThemeChanged(theme=>{const next=String(theme||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true,broadcast:true});});
    if(typeof native?.appearanceGetTheme==='function'){
      Promise.resolve(native.appearanceGetTheme()).then(remote=>{
        const next=String(remote||'').toLowerCase();
        if(VALID.has(next))apply(next,{persist:true,emit:true,broadcast:true});
        else void native.appearanceSetTheme?.(current);
      }).catch(()=>{});
    }
  }catch{}

  window.DKDSTheme=Object.freeze({version:'1.1.0',current:()=>current,system:systemTheme,set,toggle,isDark:()=>current==='dark'});
  globalThis.addEventListener?.('beforeunload',()=>{try{nativeOff?.();channel?.close?.();}catch{}},{once:true});
})();
