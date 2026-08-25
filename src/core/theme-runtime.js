(() => {
  'use strict';
  const STORAGE_KEY='dkds.appearance.v1';
  const PROFILE_KEY='dkds.theme-profile.v1';
  const CHANNEL_NAME='dkds-appearance-v1';
  const VALID=new Set(['light','dark']);
  const native=window.electronAPI||null;
  const profiles=new Map();
  let channel=null;
  let nativeOff=null;

  const PUBLIC_TOKEN_MAP=Object.freeze({
    canvas:'--dkui-canvas',surface:'--dkui-surface',surfaceSoft:'--dkui-surface-soft',surfaceHover:'--dkui-surface-hover',surfaceElevated:'--dkui-surface-elevated',surfaceSidebar:'--dkui-surface-sidebar',controlBg:'--dkui-control-bg',controlHover:'--dkui-control-hover',divider:'--dkui-divider',dividerHover:'--dkui-divider-hover',controlBorder:'--dkui-control-border',controlBorderHover:'--dkui-control-border-hover',scrollbar:'--dkui-scrollbar',scrollbarHover:'--dkui-scrollbar-hover',text:'--dkui-text',textSoft:'--dkui-text-soft',muted:'--dkui-muted',accent:'--dkui-accent',accentHover:'--dkui-accent-hover',accentSoft:'--dkui-accent-soft',focus:'--dkui-focus',shadow1:'--dkui-shadow-1',shadow2:'--dkui-shadow-2',shadowFloat:'--dkui-shadow-float',radius:'--dkui-radius',radiusLg:'--dkui-radius-lg'
  });
  const TOKEN_KEYS=Object.freeze(Object.keys(PUBLIC_TOKEN_MAP));
  const normalizeTokens=value=>{const out={};if(!value||typeof value!=='object')return out;for(const key of TOKEN_KEYS){const row=value[key];if(row!==undefined&&row!==null&&String(row).trim())out[key]=String(row).trim();}return out;};
  const normalizeProfile=(id,spec={})=>{
    const key=String(id||'').trim();if(!key)throw new Error('Theme profile id required.');
    const modes=spec.modes&&typeof spec.modes==='object'?spec.modes:{};
    const light=normalizeTokens(modes.light||spec.light||{}),dark=normalizeTokens(modes.dark||spec.dark||{});
    return Object.freeze({id:key,label:String(spec.label||key),owner:String(spec.owner||'core'),modes:Object.freeze({light:Object.freeze(light),dark:Object.freeze(dark)}),metadata:Object.freeze({...((spec.metadata&&typeof spec.metadata==='object')?spec.metadata:{})})});
  };
  profiles.set('builtin.default',normalizeProfile('builtin.default',{label:'DK Data Studio',owner:'core',modes:{light:{},dark:{}}}));

  const systemTheme=()=>{try{return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light';}catch{return 'light';}};
  const savedTheme=()=>{try{const value=String(localStorage.getItem(STORAGE_KEY)||'').trim().toLowerCase();return VALID.has(value)?value:'';}catch{return '';}};
  const savedProfile=()=>{try{return String(localStorage.getItem(PROFILE_KEY)||'').trim()||'builtin.default';}catch{return 'builtin.default';}};
  let current=savedTheme()||systemTheme();
  let activeProfile=savedProfile();
  let pendingProfile=activeProfile!=='builtin.default'&&!profiles.has(activeProfile)?activeProfile:'';
  if(pendingProfile)activeProfile='builtin.default';

  function clearProfileTokens(){const root=document.documentElement;if(!root)return;for(const cssVar of Object.values(PUBLIC_TOKEN_MAP))root.style.removeProperty(cssVar);}
  function applyProfileTokens(theme){const root=document.documentElement;if(!root)return;clearProfileTokens();const profile=profiles.get(activeProfile)||profiles.get('builtin.default');const tokens=profile?.modes?.[theme]||{};for(const [key,value] of Object.entries(tokens)){const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)root.style.setProperty(cssVar,value);}root.dataset.dkdsThemeProfile=profile?.id||'builtin.default';}
  function snapshotTokens(){const root=document.documentElement;if(!root)return Object.freeze({});const style=getComputedStyle(root),out={};for(const [key,cssVar] of Object.entries(PUBLIC_TOKEN_MAP))out[key]=style.getPropertyValue(cssVar).trim();return Object.freeze(out);}

  function apply(theme,{persist=false,emit=true,broadcast=false,nativeSync=false}={}){
    const normalized=String(theme||'').toLowerCase();
    const next=VALID.has(normalized)?normalized:systemTheme();
    const previous=current;current=next;
    const root=document.documentElement;
    if(root){root.dataset.dkdsTheme=next;root.style.colorScheme=next;applyProfileTokens(next);}
    if(persist){try{localStorage.setItem(STORAGE_KEY,next);}catch{}}
    if(broadcast){try{channel?.postMessage?.({theme:next,profile:activeProfile});}catch{}}
    if(nativeSync){try{void native?.appearanceSetTheme?.(next);}catch{}}
    if(emit&&(previous!==next)){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:next,previous,profile:activeProfile,tokens:snapshotTokens()}}));}catch{}}
    return next;
  }
  function set(theme){return apply(theme,{persist:true,emit:true,broadcast:true,nativeSync:true});}
  function toggle(){return set(current==='dark'?'light':'dark');}
  function registerProfile(id,spec={}){const profile=normalizeProfile(id,spec);profiles.set(profile.id,profile);if(pendingProfile===profile.id){pendingProfile='';setProfile(profile.id,{persist:false,emit:true,broadcast:true});}else if(activeProfile===profile.id)apply(current,{persist:false,emit:true,broadcast:true});return Object.freeze({id:profile.id,dispose:()=>unregisterProfile(profile.id)});}
  function unregisterProfile(id){const key=String(id||'');if(!key||key==='builtin.default')return false;const existed=profiles.delete(key);if(activeProfile===key)setProfile('builtin.default');return existed;}
  function setProfile(id,{persist=true,emit=true,broadcast=true}={}){const key=String(id||'').trim();if(!profiles.has(key))throw new Error(`Unknown theme profile: ${key}`);const previous=activeProfile;pendingProfile='';activeProfile=key;if(persist){try{localStorage.setItem(PROFILE_KEY,key);}catch{}}applyProfileTokens(current);if(broadcast){try{channel?.postMessage?.({theme:current,profile:key});}catch{}}if(emit&&previous!==key){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:key,previous,theme:current,tokens:snapshotTokens()}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:key,tokens:snapshotTokens()}}));}catch{}}return key;}
  function listProfiles(){return [...profiles.values()].map(profile=>Object.freeze({id:profile.id,label:profile.label,owner:profile.owner,metadata:profile.metadata}));}

  apply(current,{persist:false,emit:false});
  try{
    if(typeof BroadcastChannel==='function'){
      channel=new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message',event=>{const next=String(event?.data?.theme||'').toLowerCase(),profile=String(event?.data?.profile||'');if(profile&&profiles.has(profile)&&profile!==activeProfile){activeProfile=profile;try{localStorage.setItem(PROFILE_KEY,profile);}catch{}}if(VALID.has(next)&&(next!==current||profile))apply(next,{persist:true,emit:true});});
    }
  }catch{}
  try{globalThis.addEventListener?.('storage',event=>{if(event?.key===STORAGE_KEY){const next=String(event.newValue||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:false,emit:true});}else if(event?.key===PROFILE_KEY){const next=String(event.newValue||'');if(profiles.has(next)&&next!==activeProfile)setProfile(next,{persist:false,broadcast:false});}});}catch{}
  try{
    if(typeof native?.onAppearanceThemeChanged==='function')nativeOff=native.onAppearanceThemeChanged(theme=>{const next=String(theme||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true,broadcast:true});});
    if(typeof native?.appearanceGetTheme==='function'){
      Promise.resolve(native.appearanceGetTheme()).then(remote=>{const next=String(remote||'').toLowerCase();if(VALID.has(next))apply(next,{persist:true,emit:true,broadcast:true});else void native.appearanceSetTheme?.(current);}).catch(()=>{});
    }
  }catch{}

  window.DKDSTheme=Object.freeze({version:'2.0.0',current:()=>current,system:systemTheme,set,toggle,isDark:()=>current==='dark',profile:()=>activeProfile,setProfile,registerProfile,unregisterProfile,listProfiles,tokens:snapshotTokens,tokenNames:()=>TOKEN_KEYS.slice()});
  globalThis.addEventListener?.('beforeunload',()=>{try{nativeOff?.();channel?.close?.();}catch{}},{once:true});
})();
