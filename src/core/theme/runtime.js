(() => {
  'use strict';
  const STORAGE_KEY='dkds.appearance.v1';
  const PROFILE_KEY='dkds.theme-profile.v1';
  const SETTINGS_KEY='dkds.theme-settings.v1';
  const CHANNEL_NAME='dkds-appearance-v1';
  const VALID=new Set(['light','dark']);
  const native=window.electronAPI||null;
  const profiles=new Map();
  let channel=null;
  let nativeOff=null;

  const PUBLIC_TOKEN_MAP=Object.freeze({
    canvas:'--dkui-canvas',surface:'--dkui-surface',surfaceSoft:'--dkui-surface-soft',surfaceHover:'--dkui-surface-hover',surfaceElevated:'--dkui-surface-elevated',surfaceSidebar:'--dkui-surface-sidebar',controlBg:'--dkui-control-bg',controlHover:'--dkui-control-hover',divider:'--dkui-divider',dividerHover:'--dkui-divider-hover',controlBorder:'--dkui-control-border',controlBorderHover:'--dkui-control-border-hover',scrollbar:'--dkui-scrollbar',scrollbarHover:'--dkui-scrollbar-hover',text:'--dkui-text',textSoft:'--dkui-text-soft',muted:'--dkui-muted',accent:'--dkui-accent',accentHover:'--dkui-accent-hover',accentSoft:'--dkui-accent-soft',focus:'--dkui-focus',shadow1:'--dkui-shadow-1',shadow2:'--dkui-shadow-2',shadowFloat:'--dkui-shadow-float',radius:'--dkui-radius',radiusLg:'--dkui-radius-lg',motionFast:'--dkui-motion-fast',motionNormal:'--dkui-motion-normal',motionSlow:'--dkui-motion-slow',easeStandard:'--dkui-ease-standard',easeEmphasized:'--dkui-ease-emphasized',hoverLift:'--dkui-hover-lift',pressScale:'--dkui-press-scale',materialBlur:'--dkui-material-blur',materialBlurStrong:'--dkui-material-blur-strong',materialSaturation:'--dkui-material-saturation',materialTintOpacity:'--dkui-material-tint-opacity',specularHighlight:'--dkui-specular-highlight',innerHighlight:'--dkui-inner-highlight',glassEdge:'--dkui-glass-edge',materialNoiseOpacity:'--dkui-material-noise-opacity'
  });
  const TOKEN_KEYS=Object.freeze(Object.keys(PUBLIC_TOKEN_MAP));
  const MOTION_KEYS=Object.freeze(['motionFast','motionNormal','motionSlow','easeStandard','easeEmphasized','hoverLift','pressScale']);
  const MATERIAL_KEYS=Object.freeze(['materialBlur','materialBlurStrong','materialSaturation','materialTintOpacity','specularHighlight','innerHighlight','glassEdge','materialNoiseOpacity']);
  const ThemeContract=globalThis.DKDSThemeContract;
  if(!ThemeContract||ThemeContract.version!=='3.5.0')throw new Error('Theme Contract 3.5 runtime is unavailable.');
  const MATERIAL_ROLES=Object.freeze(ThemeContract.materialRoles());
  const MATERIAL_SUFFIX=Object.freeze({materialBlur:'blur',materialBlurStrong:'blur-strong',materialSaturation:'saturation',materialTintOpacity:'tint-opacity',specularHighlight:'specular-highlight',innerHighlight:'inner-highlight',glassEdge:'glass-edge',materialNoiseOpacity:'noise-opacity'});
  const roleCssVar=(role,key)=>`--dkui-material-${role}-${MATERIAL_SUFFIX[key]}`;
  const normalizeProfile=(id,spec={})=>{
    const key=String(id||'').trim();if(!key)throw new Error('Theme profile id required.');
    const normalized=ThemeContract.validateProfile(spec,`theme.profile.${key}`);
    return Object.freeze({id:key,label:String(normalized.label||key),owner:String(normalized.owner||'core'),modes:normalized.modes,motion:normalized.motion,material:normalized.material,recipes:normalized.recipes||Object.freeze({}),settings:normalized.settings||Object.freeze([]),metadata:normalized.metadata});
  };
  profiles.set('builtin.default',normalizeProfile('builtin.default',{label:'DK Data Studio',owner:'core',recipes:{chrome:'clear',sidebar:'clear',surface:'clear',elevated:'clear',popover:'clear',control:'clear',floating:'clear'},modes:{light:{},dark:{}}}));
  profiles.set('builtin.thin-glass',normalizeProfile('builtin.thin-glass',{
    label:'Thin Glass',owner:'core',metadata:{family:'thin-glass',materialSystem:'thin-glass',visualReference:'SDK Thin Glass 1.7.0'},
    recipes:{chrome:'thin-glass',sidebar:'thin-glass',surface:'clear',elevated:'thin-glass',popover:'thin-glass',control:'clear',floating:'thin-glass'},
    // Built-in Thin Glass authors semantic surfaces and material values only.
    // Core owns recipe behavior, so SDK themes selecting the same recipe share
    // identical composition, portal, control and readability semantics.
    material:{materialBlur:7,materialBlurStrong:10,materialSaturation:1.02,materialTintOpacity:0,specularHighlight:'transparent',innerHighlight:'transparent',glassEdge:'rgba(100,116,139,.42)',materialNoiseOpacity:0,
      roles:{chrome:{materialBlur:6,materialBlurStrong:6,materialSaturation:1.01,materialTintOpacity:0},sidebar:{materialBlur:6,materialBlurStrong:6,materialSaturation:1.01,materialTintOpacity:0},elevated:{materialBlur:8,materialBlurStrong:8,materialSaturation:1.02,materialTintOpacity:0},popover:{materialBlur:10,materialBlurStrong:10,materialSaturation:1.02,materialTintOpacity:0},floating:{materialBlur:8,materialBlurStrong:8,materialSaturation:1.02,materialTintOpacity:0},surface:{materialBlur:0,materialTintOpacity:1},control:{materialBlur:0,materialTintOpacity:1}}},
    modes:{
      light:{tokens:{canvas:'#EAF0F7',surface:'#F8FAFD',surfaceSoft:'rgba(239,244,250,.90)',surfaceHover:'#E8F0FB',surfaceElevated:'rgba(255,255,255,.74)',surfaceSidebar:'rgba(233,240,248,.82)',controlBg:'rgba(255,255,255,.88)',controlHover:'#EDF3FA',divider:'rgba(116,132,154,.48)',dividerHover:'rgba(82,101,128,.66)',controlBorder:'#B8C5D6',controlBorderHover:'#8799B2',scrollbar:'rgba(113,128,150,.34)',scrollbarHover:'rgba(82,101,128,.50)',text:'#172033',textSoft:'#36465D',muted:'#59697F',accent:'#2563EB',accentHover:'#1D4ED8',accentSoft:'rgba(37,99,235,.10)',focus:'rgba(37,99,235,.17)',shadow1:'0 0 0 1px rgba(101,116,139,.08),0 2px 7px rgba(69,84,110,.10)',shadow2:'0 0 0 1px rgba(101,116,139,.08),0 5px 16px rgba(69,84,110,.12)',shadowFloat:'0 0 0 1px rgba(101,116,139,.10),0 8px 22px rgba(69,84,110,.15)',radius:10,radiusLg:13},material:{glassEdge:'rgba(203,213,225,.72)',roles:{chrome:{glassEdge:'rgba(203,213,225,.70)'},sidebar:{glassEdge:'rgba(203,213,225,.68)'},elevated:{glassEdge:'rgba(203,213,225,.76)'},popover:{glassEdge:'rgba(203,213,225,.88)'},floating:{glassEdge:'rgba(203,213,225,.80)'}}}},
      dark:{tokens:{canvas:'#0B1020',surface:'#111827',surfaceSoft:'rgba(17,24,39,.80)',surfaceHover:'#1E293B',surfaceElevated:'rgba(23,32,51,.52)',surfaceSidebar:'rgba(15,23,42,.46)',controlBg:'#0F172A',controlHover:'#1E293B',divider:'rgba(71,85,105,.60)',dividerHover:'rgba(100,116,139,.76)',controlBorder:'#3A485C',controlBorderHover:'#52627A',scrollbar:'rgba(71,85,105,.46)',scrollbarHover:'rgba(100,116,139,.62)',text:'#E6ECF4',textSoft:'#CBD5E1',muted:'#98A6B9',accent:'#316BFF',accentHover:'#6AA7FF',accentSoft:'rgba(49,107,255,.16)',focus:'rgba(106,167,255,.20)',shadow1:'0 0 0 1px rgba(148,163,184,.10),0 2px 8px rgba(0,0,0,.22)',shadow2:'0 0 0 1px rgba(148,163,184,.11),0 5px 16px rgba(0,0,0,.26)',shadowFloat:'0 0 0 1px rgba(148,163,184,.12),0 8px 24px rgba(0,0,0,.30)',radius:10,radiusLg:13},material:{glassEdge:'rgba(71,85,105,.64)',roles:{chrome:{glassEdge:'rgba(51,65,85,.68)'},sidebar:{glassEdge:'rgba(51,65,85,.66)'},elevated:{glassEdge:'rgba(71,85,105,.68)'},popover:{glassEdge:'rgba(71,85,105,.82)'},floating:{glassEdge:'rgba(71,85,105,.72)'}}}}
    }
  }));


  const readSettingsStore=()=>{try{const parsed=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}catch{return {};}};
  let settingsStore=readSettingsStore();
  const saveSettingsStore=()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settingsStore));}catch{}};
  const settingRows=(profileId=activeProfile)=>profiles.get(String(profileId||activeProfile))?.settings||Object.freeze([]);
  function settingValue(profile,row,mode=current){
    const saved=settingsStore?.[profile.id]?.[row.id];if(saved!==undefined)return saved;
    const resolved=ThemeContract.resolveProfile(profile,mode),t=row.target||{};
    if(t.scope==='recipe')return recipePolicy(profile.id,mode)[t.role];
    if(t.scope==='material')return t.role?resolved.material?.roles?.[t.role]?.[t.key]??resolved.material?.base?.[t.key]:resolved.material?.base?.[t.key];
    if(t.scope==='motion')return resolved.motion?.[t.key];
    return resolved.tokens?.[t.key];
  }
  function normalizeSettingInput(row,value){
    const t=row.target||{};
    if(row.type==='select'&&Array.isArray(row.options)&&row.options.length&&!row.options.some(opt=>String(opt.value)===String(value)))throw new Error(`Invalid option for theme setting ${row.id}`);
    if(row.type==='range'||row.type==='number'){const n=Number(value);if(!Number.isFinite(n))throw new Error(`Theme setting ${row.id} must be numeric.`);if(row.min!==undefined&&n<row.min)throw new Error(`Theme setting ${row.id} must be >= ${row.min}.`);if(row.max!==undefined&&n>row.max)throw new Error(`Theme setting ${row.id} must be <= ${row.max}.`);}
    if(t.scope==='recipe'){const v=String(value||'');if(!ThemeContract.materialRecipes().includes(v))throw new Error(`Invalid material recipe: ${v}`);return v;}
    return ThemeContract.parseToken(t.key,value,`theme.setting.${row.id}`);
  }
  function settingUiValue(row,value){
    if(value==null||row.type==='select')return value;const key=row.target?.key,s=String(value).trim();
    if(['materialTintOpacity','materialNoiseOpacity'].includes(key)){const n=parseFloat(s);return Number.isFinite(n)?(s.endsWith('%')?n/100:n):0;}
    if(['materialBlur','materialBlurStrong','radius','radiusLg','hoverLift','motionFast','motionNormal','motionSlow','materialSaturation','pressScale'].includes(key)){const n=parseFloat(s);return Number.isFinite(n)?n:0;}
    return value;
  }
  function settings(profileId=activeProfile){
    const profile=profiles.get(String(profileId||activeProfile));if(!profile)return Object.freeze([]);
    return Object.freeze(settingRows(profile.id).map(row=>Object.freeze({...row,value:settingUiValue(row,settingValue(profile,row,current))})));
  }
  function setSetting(profileId,id,value){
    const pid=String(profileId||activeProfile),profile=profiles.get(pid);if(!profile)throw new Error(`Unknown theme profile: ${pid}`);const row=settingRows(pid).find(item=>item.id===String(id||''));if(!row)throw new Error(`Unknown theme setting: ${id}`);
    const normalized=normalizeSettingInput(row,value);settingsStore={...settingsStore,[pid]:{...(settingsStore[pid]||{}),[row.id]:normalized}};saveSettingsStore();if(pid===activeProfile)applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-settings-changed',{detail:{profile:pid,id:row.id,value:normalized,theme:current}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:pid,tokens:snapshotTokens()}}));}catch{}return normalized;
  }
  function resetSettings(profileId=activeProfile){const pid=String(profileId||activeProfile);if(settingsStore[pid]!==undefined){const next={...settingsStore};delete next[pid];settingsStore=next;saveSettingsStore();if(pid===activeProfile)applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-settings-changed',{detail:{profile:pid,reset:true,theme:current}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:pid,tokens:snapshotTokens()}}));}catch{}}return true;}
  function recipePolicy(profileId=activeProfile,mode=current){
    const profile=profiles.get(String(profileId||activeProfile))||profiles.get('builtin.default');
    let out={...(profile?.recipes||{})};
    for(const row of settingRows(profile?.id)){const t=row.target||{};if(t.scope!=='recipe'||(t.mode&&t.mode!=='all'&&t.mode!==mode))continue;const saved=settingsStore?.[profile.id]?.[row.id];if(saved!==undefined)out[t.role]=String(saved);}
    return Object.freeze(out);
  }
  function applySettingOverrides(profile,theme){
    const root=document.documentElement;if(!root)return;for(const row of settingRows(profile.id)){const t=row.target||{};if(t.scope==='recipe'||(t.mode&&t.mode!=='all'&&t.mode!==theme))continue;const saved=settingsStore?.[profile.id]?.[row.id];if(saved===undefined)continue;const key=t.key,value=saved;
      if(t.scope==='material'){if(t.role)root.style.setProperty(roleCssVar(t.role,key),cssTokenValue(key,value));else{const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)root.style.setProperty(cssVar,cssTokenValue(key,value));}}
      else {const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)root.style.setProperty(cssVar,value);}
    }
  }

  const systemTheme=()=>{try{return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light';}catch{return 'light';}};
  const savedTheme=()=>{try{const value=String(localStorage.getItem(STORAGE_KEY)||'').trim().toLowerCase();return VALID.has(value)?value:'';}catch{return '';}};
  const savedProfile=()=>{try{return String(localStorage.getItem(PROFILE_KEY)||'').trim()||'builtin.default';}catch{return 'builtin.default';}};
  const bootTheme=savedTheme();
  let current=bootTheme||systemTheme();
  let preferredProfile=savedProfile();
  let activeProfile=profiles.has(preferredProfile)?preferredProfile:'builtin.default';
  let pendingProfile=activeProfile===preferredProfile?'':preferredProfile;

  function clearProfileTokens(){const root=document.documentElement;if(!root)return;for(const cssVar of Object.values(PUBLIC_TOKEN_MAP))root.style.removeProperty(cssVar);for(const role of MATERIAL_ROLES)for(const key of MATERIAL_KEYS)root.style.removeProperty(roleCssVar(role,key));}
  const cssTokenValue=(key,value)=>{if(['materialTintOpacity','materialNoiseOpacity'].includes(key)){const n=Number(value);if(Number.isFinite(n))return `${Math.max(0,Math.min(1,n))*100}%`;}return value;};
  function applyProfileTokens(theme){const root=document.documentElement;if(!root)return;clearProfileTokens();const profile=profiles.get(activeProfile)||profiles.get('builtin.default');const resolved=ThemeContract.resolveProfile(profile,theme);const tokens={...(resolved?.material?.base||{}),...(resolved?.motion||{}),...(resolved?.tokens||{})};for(const [key,value] of Object.entries(tokens)){const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)root.style.setProperty(cssVar,cssTokenValue(key,value));}for(const role of MATERIAL_ROLES){const effective={...(resolved?.material?.base||{}),...(resolved?.material?.roles?.[role]||{})};for(const [key,value] of Object.entries(effective)){if(MATERIAL_KEYS.includes(key))root.style.setProperty(roleCssVar(role,key),cssTokenValue(key,value));}}applySettingOverrides(profile,theme);root.dataset.dkdsThemeProfile=profile?.id||'builtin.default';}
  function snapshotTokens(){const root=document.documentElement;if(!root)return Object.freeze({});const style=getComputedStyle(root),out={};for(const [key,cssVar] of Object.entries(PUBLIC_TOKEN_MAP))out[key]=style.getPropertyValue(cssVar).trim();return Object.freeze(out);}

  function apply(theme,{persist=false,emit=true,broadcast=false,nativeSync=false}={}){
    const normalized=String(theme||'').toLowerCase();
    const next=VALID.has(normalized)?normalized:systemTheme();
    const previous=current;current=next;
    const root=document.documentElement;
    if(root){root.dataset.dkdsTheme=next;root.style.colorScheme=next;applyProfileTokens(next);}
    if(persist){try{localStorage.setItem(STORAGE_KEY,next);}catch{}}
    if(broadcast){try{channel?.postMessage?.({theme:next,preferredProfile,activeProfile});}catch{}}
    if(nativeSync){try{void native?.appearanceSetTheme?.(next);}catch{}}
    if(emit&&(previous!==next)){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:next,previous,profile:activeProfile,tokens:snapshotTokens()}}));}catch{}}
    return next;
  }
  function set(theme){return apply(theme,{persist:true,emit:true,broadcast:true,nativeSync:true});}
  function toggle(){return set(current==='dark'?'light':'dark');}
  function registerProfile(id,spec={}){const profile=normalizeProfile(id,spec);profiles.set(profile.id,profile);if(pendingProfile===profile.id||preferredProfile===profile.id&&activeProfile!==profile.id){pendingProfile='';const previous=activeProfile;activeProfile=profile.id;applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:profile.id,previous,theme:current,restored:true,tokens:snapshotTokens()}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:profile.id,tokens:snapshotTokens()}}));}catch{}}else if(activeProfile===profile.id)apply(current,{persist:false,emit:true,broadcast:true});return Object.freeze({id:profile.id,dispose:()=>unregisterProfile(profile.id)});}
  function unregisterProfile(id){const key=String(id||'');if(!key||key==='builtin.default')return false;const existed=profiles.delete(key);if(activeProfile===key){const previous=activeProfile;if(preferredProfile===key)pendingProfile=key;activeProfile='builtin.default';applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:activeProfile,previous,theme:current,suspended:key,tokens:snapshotTokens()}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:activeProfile,tokens:snapshotTokens()}}));}catch{}}return existed;}
  function setProfile(id,{persist=true,emit=true,broadcast=true}={}){const key=String(id||'').trim();if(!profiles.has(key))throw new Error(`Unknown theme profile: ${key}`);const previous=activeProfile;pendingProfile='';preferredProfile=key;activeProfile=key;if(persist){try{localStorage.setItem(PROFILE_KEY,key);}catch{}}applyProfileTokens(current);if(broadcast){try{channel?.postMessage?.({theme:current,preferredProfile:key,activeProfile:key});}catch{}}if(emit&&previous!==key){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:key,previous,theme:current,tokens:snapshotTokens()}}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:key,tokens:snapshotTokens()}}));}catch{}}return key;}
  function listProfiles(){return [...profiles.values()].map(profile=>Object.freeze({id:profile.id,label:profile.label,owner:profile.owner,metadata:profile.metadata,settings:profile.settings.length,recipes:recipePolicy(profile.id)}));}
  function previewProfile(id=activeProfile,theme=current){const key=String(id||activeProfile),mode=VALID.has(String(theme))?String(theme):current,profile=profiles.get(key)||profiles.get('builtin.default'),resolved=ThemeContract.resolveProfile(profile,mode);return Object.freeze({id:profile?.id||'builtin.default',label:profile?.label||'',owner:profile?.owner||'core',mode,tokens:resolved.tokens,motion:resolved.motion,material:resolved.material,recipes:recipePolicy(profile?.id||'builtin.default',mode),settings:settings(profile?.id||'builtin.default')});}
  function materialSnapshot(platform='web'){return ThemeContract.projectMaterial(previewProfile(activeProfile,current).material,platform);}

  apply(current,{persist:false,emit:false});
  try{
    if(typeof BroadcastChannel==='function'){
      channel=new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message',event=>{const next=String(event?.data?.theme||'').toLowerCase(),profile=String(event?.data?.preferredProfile||event?.data?.profile||'');if(profile){preferredProfile=profile;try{localStorage.setItem(PROFILE_KEY,profile);}catch{}if(profiles.has(profile)){pendingProfile='';if(profile!==activeProfile){const previous=activeProfile;activeProfile=profile;applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile,previous,theme:current,tokens:snapshotTokens()}}));}catch{}}}else{pendingProfile=profile;if(activeProfile!== 'builtin.default'){const previous=activeProfile;activeProfile='builtin.default';applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:activeProfile,previous,theme:current,pending:profile,tokens:snapshotTokens()}}));}catch{}}}}if(VALID.has(next)&&(next!==current||profile))apply(next,{persist:true,emit:true});});
    }
  }catch{}
  try{globalThis.addEventListener?.('storage',event=>{if(event?.key===STORAGE_KEY){const next=String(event.newValue||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:false,emit:true});}else if(event?.key===PROFILE_KEY){const next=String(event.newValue||'').trim()||'builtin.default';preferredProfile=next;if(profiles.has(next)){pendingProfile='';if(next!==activeProfile)setProfile(next,{persist:false,broadcast:false});}else{pendingProfile=next;if(activeProfile!=='builtin.default'){const previous=activeProfile;activeProfile='builtin.default';applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:{profile:activeProfile,previous,theme:current,pending:next,tokens:snapshotTokens()}}));}catch{}}}}});}catch{}
  try{
    if(typeof native?.onAppearanceThemeChanged==='function')nativeOff=native.onAppearanceThemeChanged(theme=>{const next=String(theme||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true,broadcast:true});});
    if(typeof native?.appearanceGetTheme==='function'){
      Promise.resolve(native.appearanceGetTheme()).then(remote=>{const next=String(remote||'').toLowerCase();if(bootTheme){if(next!==current)void native.appearanceSetTheme?.(current);}else if(VALID.has(next))apply(next,{persist:true,emit:true,broadcast:true});else void native.appearanceSetTheme?.(current);}).catch(()=>{});
    }
  }catch{}

  function rendererCapabilities(){return globalThis.DKDSThemeMaterialRenderer?.capabilities?.()||Object.freeze({version:'0.0.0',recipeInstalled:false,engine:{},renderer:{backdropBlur:false,saturation:false,noise:false,glassEdge:false,innerHighlight:false,specularHighlight:false,webMaterial:false,nativeBlur:false,thinGlass:false,nonUniformBlur:false,edgeRefraction:false,dynamicSpecular:false,liquidGlass:false},recipes:{clear:false,'thin-glass':false,'soft-glass':false,'liquid-glass':false},roles:{}});}
  function supports(feature){const key=String(feature||'').trim();if(!key)return false;if(key.startsWith('renderer.'))return globalThis.DKDSThemeMaterialRenderer?.supports?.(key)===true;return ThemeContract.supports(key);}

  window.DKDSTheme=Object.freeze({version:'3.5.0',contractVersion:'3.5.0',supports,rendererCapabilities,current:()=>current,system:systemTheme,set,toggle,isDark:()=>current==='dark',profile:()=>activeProfile,preferredProfile:()=>preferredProfile,setProfile,registerProfile,unregisterProfile,listProfiles,settings,setSetting,resetSettings,recipePolicy,tokens:snapshotTokens,tokenNames:()=>TOKEN_KEYS.slice(),materialRoles:()=>MATERIAL_ROLES.slice(),materials:materialSnapshot,platformUnits:()=>ThemeContract.platformUnits,preview:previewProfile,coverage:()=>globalThis.DKDSThemeCoverage?.scan?.()||Object.freeze({version:'0.0.0',summary:{ok:false,reason:'Theme Coverage Runtime unavailable'}})});
  globalThis.addEventListener?.('beforeunload',()=>{try{nativeOff?.();channel?.close?.();}catch{}},{once:true});
})();
