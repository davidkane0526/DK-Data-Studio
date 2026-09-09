(() => {
  'use strict';
  const StyleGate=globalThis.DKDSStyleGate;
  if(!StyleGate)throw new Error('DKDSStyleGate is required before Theme runtime.');
  const STYLE_SOURCE='src/core/theme/runtime.js';
  const themeToken=(el,token,value)=>StyleGate.setToken(el,token,value,{owner:'core.theme-runtime',scope:'runtime-theme-token',source:STYLE_SOURCE});
  const removeThemeToken=(el,token)=>StyleGate.remove(el,token,{owner:'core.theme-runtime',kind:StyleGate.KINDS.CONFIG_TOKEN,scope:'runtime-theme-token',source:STYLE_SOURCE});
  const themeProperty=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.theme-runtime',scope:'runtime-theme-property',source:STYLE_SOURCE});
  const STORAGE_KEY='dkds.appearance.v1';
  const PROFILE_KEY='dkds.theme-profile.v1';
  const SETTINGS_KEY='dkds.theme-settings.v1';
  const BOOT_STATE_KEY='dkds.theme-boot.v1';
  const CHANNEL_NAME='dkds-appearance-v1';
  const VALID=new Set(['light','dark']);
  const native=window.electronAPI||null;
  const profiles=new Map();
  let channel=null;
  let nativeOff=null;

  const PUBLIC_TOKEN_MAP=Object.freeze({
    canvas:'--dkui-canvas',surface:'--dkui-surface',surfaceSoft:'--dkui-surface-soft',surfaceHover:'--dkui-surface-hover',surfaceElevated:'--dkui-surface-elevated',surfaceSidebar:'--dkui-surface-sidebar',controlBg:'--dkui-control-bg',controlHover:'--dkui-control-hover',divider:'--dkui-divider',dividerHover:'--dkui-divider-hover',controlBorder:'--dkui-control-border',controlBorderHover:'--dkui-control-border-hover',scrollbar:'--dkui-scrollbar',scrollbarHover:'--dkui-scrollbar-hover',text:'--dkui-text',textSoft:'--dkui-text-soft',muted:'--dkui-muted',accent:'--dkui-accent',accentHover:'--dkui-accent-hover',accentSoft:'--dkui-accent-soft',accentAlt:'--dkui-accent-alt',accentAltHover:'--dkui-accent-alt-hover',accentAltSoft:'--dkui-accent-alt-soft',focus:'--dkui-focus',success:'--dkui-success',successSoft:'--dkui-success-soft',warning:'--dkui-warning',warningSoft:'--dkui-warning-soft',danger:'--dkui-danger',dangerSoft:'--dkui-danger-soft',info:'--dkui-info',infoSoft:'--dkui-info-soft',selectionSurface:'--dkui-selection-surface',selectionText:'--dkui-selection-text',selectionBorder:'--dkui-selection-border',activeSurface:'--dkui-active-surface',activeText:'--dkui-active-text',disabledSurface:'--dkui-disabled-surface',disabledText:'--dkui-disabled-text',shadow1:'--dkui-shadow-1',shadow2:'--dkui-shadow-2',shadowFloat:'--dkui-shadow-float',radius:'--dkui-radius',radiusLg:'--dkui-radius-lg',motionFast:'--dkui-motion-fast',motionNormal:'--dkui-motion-normal',motionSlow:'--dkui-motion-slow',easeStandard:'--dkui-ease-standard',easeEmphasized:'--dkui-ease-emphasized',hoverLift:'--dkui-hover-lift',pressScale:'--dkui-press-scale',materialBlur:'--dkui-material-blur',materialBlurStrong:'--dkui-material-blur-strong',materialSaturation:'--dkui-material-saturation',materialTintOpacity:'--dkui-material-tint-opacity',specularHighlight:'--dkui-specular-highlight',innerHighlight:'--dkui-inner-highlight',glassEdge:'--dkui-glass-edge',materialNoiseOpacity:'--dkui-material-noise-opacity'
  });
  const TOKEN_KEYS=Object.freeze(Object.keys(PUBLIC_TOKEN_MAP));
  const MOTION_KEYS=Object.freeze(['motionFast','motionNormal','motionSlow','easeStandard','easeEmphasized','hoverLift','pressScale']);
  const MATERIAL_KEYS=Object.freeze(['materialBlur','materialBlurStrong','materialSaturation','materialTintOpacity','specularHighlight','innerHighlight','glassEdge','materialNoiseOpacity']);
  const ThemeContract=globalThis.DKDSThemeContract;
  if(!ThemeContract||ThemeContract.version!=='3.10.0')throw new Error('Theme Contract 3.10 runtime is unavailable.');
  const MATERIAL_ROLES=Object.freeze(ThemeContract.materialRoles());
  const COMPONENT_APPEARANCE_COMPONENTS=Object.freeze(ThemeContract.componentAppearanceComponents());
  const COMPONENT_APPEARANCE_KEYS=Object.freeze(ThemeContract.componentAppearanceKeys());
  const COMPONENT_VARIANTS=Object.freeze(ThemeContract.componentVariants?.()||[]);
  const COMPONENT_CONTEXTS=Object.freeze(ThemeContract.componentContexts?.()||[]);
  const MATERIAL_CONTEXTS=Object.freeze(ThemeContract.materialContexts?.()||[]);
  const EFFECT_KEYS=Object.freeze(ThemeContract.effectKeys?.()||[]);
  const ROLE_APPEARANCE_SUFFIX=Object.freeze({surface:'surface',border:'border',text:'text'});
  const MATERIAL_SUFFIX=Object.freeze({materialBlur:'blur',materialBlurStrong:'blur-strong',materialSaturation:'saturation',materialTintOpacity:'tint-opacity',specularHighlight:'specular-highlight',innerHighlight:'inner-highlight',glassEdge:'glass-edge',materialNoiseOpacity:'noise-opacity'});
  const roleCssVar=(role,key)=>`--dkui-material-${role}-${MATERIAL_SUFFIX[key]}`;
  const roleAppearanceCssVar=(role,key)=>`--dkui-role-${role}-${ROLE_APPEARANCE_SUFFIX[key]}`;
  const kebab=value=>String(value||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
  const componentAppearanceCssVar=(component,key)=>`--dkui-component-${kebab(component)}-${kebab(key)}`;
  const componentVariantCssVar=(component,variant,key)=>`--dkui-component-${kebab(component)}-variant-${kebab(variant)}-${kebab(key)}`;
  const effectCssVar=key=>`--dkui-effect-${kebab(key)}`;
  const effectCssValue=(key,value)=>key==='glowIntensity'?`${Math.max(0,Math.min(1,Number(value)||0))*100}%`:value;
  const normalizeProfile=(id,spec={})=>{
    const key=String(id||'').trim();if(!key)throw new Error('Theme profile id required.');
    const normalized=ThemeContract.validateProfile(spec,`theme.profile.${key}`);
    return Object.freeze({id:key,label:String(normalized.label||key),owner:String(normalized.owner||'core'),modes:normalized.modes,motion:normalized.motion,material:normalized.material,appearance:normalized.appearance,effects:normalized.effects||Object.freeze({}),scientific:normalized.scientific,recipes:normalized.recipes||Object.freeze({}),settings:normalized.settings||Object.freeze([]),metadata:normalized.metadata});
  };
  profiles.set('builtin.default',normalizeProfile('builtin.default',{
    label:'DK Data Studio',
    owner:'core',
    recipes:{chrome:'clear',sidebar:'clear',surface:'clear',elevated:'clear',popover:'clear',control:'clear',floating:'clear'},
    modes:{
      light:{
        appearance:{components:{
          toolbarGroup:{surface:'#f6f9fd',border:'rgba(102,132,168,.085)',text:'#1c2a43',shadow:'0 1px 2px rgba(54,72,98,.05)',radius:8},
          panelHeader:{surface:'#f5f8fc',text:'#27364d',textSoft:'#65758a',border:'rgba(102,132,168,.12)',indicator:'#4b74b9'},
          inspectorHeader:{surface:'#f5f8fc',text:'#27364d',textSoft:'#65758a',border:'rgba(102,132,168,.12)',indicator:'#5d7fbd'},
          chip:{variants:{quiet:{surface:'transparent',text:'#65758a',border:'transparent',indicator:'transparent'}}},
          toolbarAction:{
            surface:'transparent',surfaceHover:'#f0f5fc',surfaceActive:'#eaf2ff',surfaceSelected:'#eaf2ff',text:'#1c2a43',textActive:'#174ea6',textSelected:'#174ea6',border:'transparent',borderHover:'rgba(102,132,168,.22)',borderActive:'rgba(71,116,197,.34)',shadow:'none',shadowHover:'none',shadowActive:'none',shadowSelected:'0 0 0 2px rgba(71,116,197,.14)',radius:7,
            variants:{primary:{surface:'#4B74B9',surfaceHover:'#416AAE',surfaceActive:'#385F9F',text:'#FFFFFF',textActive:'#FFFFFF',border:'#4B74B9',borderHover:'#416AAE',borderActive:'#385F9F',indicator:'#FFFFFF'}},
            contexts:{grouped:{shadow:'none',shadowHover:'none',shadowActive:'none',shadowSelected:'none',variants:{active:{border:'transparent'},selected:{border:'transparent'}}},standalone:{variants:{primary:{shadow:'0 0 0 2px rgba(71,116,197,.12)'},selected:{shadow:'0 0 0 2px rgba(71,116,197,.14)'}}}}
          },
          floatingChrome:{surface:'#EEF4FB',surfaceHover:'#E5EEF9',surfaceActive:'#DCE9F8',text:'#33445B',border:'#B9CBE1',borderHover:'#78A2D7',borderActive:'#5E8FCD',indicator:'#6E9CD6'}
        }}
      },
      dark:{
        appearance:{components:{
          toolbarGroup:{surface:'#252b34',border:'rgba(214,220,228,.09)',text:'#e7ebf0',shadow:'0 1px 2px rgba(0,0,0,.18)',radius:8},
          panelHeader:{surface:'#1d2530',text:'#e8edf4',textSoft:'#9ba5b2',border:'rgba(198,206,216,.09)',indicator:'#98a2af'},
          inspectorHeader:{surface:'#1d2530',text:'#e8edf4',textSoft:'#9ba5b2',border:'rgba(198,206,216,.09)',indicator:'#98a2af'},
          chip:{variants:{quiet:{surface:'transparent',text:'#9ba5b2',border:'transparent',indicator:'transparent'}}},
          toolbarAction:{
            surface:'transparent',surfaceHover:'#303640',surfaceActive:'#3a4049',surfaceSelected:'#3a4049',text:'#e7ebf0',textActive:'#ffffff',textSelected:'#ffffff',border:'transparent',borderHover:'rgba(232,236,242,.09)',borderActive:'transparent',shadow:'none',shadowHover:'none',shadowActive:'none',shadowSelected:'none',radius:7,
            variants:{primary:{surface:'#526F9F',surfaceHover:'#6281B3',surfaceActive:'#47638E',text:'#FFFFFF',textActive:'#FFFFFF',border:'#526F9F',borderHover:'#6281B3',borderActive:'#47638E',indicator:'#FFFFFF'}},
            contexts:{grouped:{shadow:'none',shadowHover:'none',shadowActive:'none',shadowSelected:'none',variants:{active:{border:'transparent'},selected:{border:'transparent'}}},standalone:{variants:{primary:{shadow:'none'},selected:{shadow:'none'}}}}
          },
          floatingChrome:{surface:'#202A38',surfaceHover:'#28374A',surfaceActive:'#30435A',text:'#DCE6F2',border:'#3D526B',borderHover:'#6D8FB8',borderActive:'#557AA8',indicator:'#789BC5'}
        }}
      }
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
  function computeRecipePolicy(profile,mode=current){
    const out={};for(const role of MATERIAL_ROLES)if(profile?.recipes?.[role])out[role]=profile.recipes[role];
    for(const row of settingRows(profile?.id)){const target=row.target||{};if(target.scope!=='recipe'||(target.mode&&target.mode!=='all'&&target.mode!==mode))continue;const saved=settingsStore?.[profile.id]?.[row.id];if(saved!==undefined)out[target.role]=String(saved);}
    return Object.freeze(out);
  }
  function pendingBootMatches(mode=current){return !!pendingProfile&&String(bootState?.profile||'')===preferredProfile&&String(bootState?.theme||'')===String(mode||current)&&!!bootState?.resolved;}
  function recipePolicy(profileId='',mode=current){
    const requested=String(profileId||'').trim();
    if((!requested||requested===activeProfile)&&pendingBootMatches(mode)&&bootState?.recipes&&typeof bootState.recipes==='object')return Object.freeze({...bootState.recipes});
    const profile=profiles.get(requested||activeProfile)||profiles.get('builtin.default');return computeRecipePolicy(profile,mode);
  }
  function recipeFor(role,context='',profileId='',mode=current){
    const requested=String(profileId||'').trim(),roleId=String(role||''),contextId=String(context||'');
    if((!requested||requested===activeProfile)&&pendingBootMatches(mode)){const contextRecipe=bootState?.recipeContexts?.[contextId]?.[roleId];return String(contextRecipe||recipePolicy('',mode)[roleId]||'');}
    const profile=profiles.get(requested||activeProfile)||profiles.get('builtin.default'),base=computeRecipePolicy(profile,mode),contextRecipe=profile?.recipes?.contexts?.[contextId]?.[roleId];return String(contextRecipe||base[roleId]||'');
  }
  function applySettingOverrides(profile,theme){
    const root=document.documentElement;if(!root)return;for(const row of settingRows(profile.id)){const t=row.target||{};if(t.scope==='recipe'||(t.mode&&t.mode!=='all'&&t.mode!==theme))continue;const saved=settingsStore?.[profile.id]?.[row.id];if(saved===undefined)continue;const key=t.key,value=saved;
      if(t.scope==='material'){if(t.role)themeToken(root,roleCssVar(t.role,key),cssTokenValue(key,value));else{const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)themeToken(root,cssVar,cssTokenValue(key,value));}}
      else {const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)themeToken(root,cssVar,value);}
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
  const bootState=(()=>{try{const row=JSON.parse(localStorage.getItem(BOOT_STATE_KEY)||'null');return row&&typeof row==='object'?row:null;}catch{return null;}})();
  const canPreservePendingBoot=theme=>!!pendingProfile&&String(bootState?.profile||'')===preferredProfile&&String(bootState?.theme||'')===String(theme||current);
  function restorePendingBootState(theme=current){
    if(!canPreservePendingBoot(theme))return false;
    const root=document.documentElement,vars=bootState?.vars&&typeof bootState.vars==='object'?bootState.vars:null;if(!root||!vars)return false;
    clearProfileTokens();
    for(const [name,value] of Object.entries(vars))if(typeof name==='string'&&name.startsWith('--')&&value!==undefined&&value!==null&&String(value)!=='')themeToken(root,name,String(value));
    root.dataset.dkdsTheme=String(theme||current);themeProperty(root,'color-scheme',String(theme||current));root.dataset.dkdsThemeProfile=preferredProfile;
    if(bootState?.headerEffect==='true'||bootState?.headerEffect==='false')root.dataset.dkdsThemeHeaderEffect=bootState.headerEffect;
    refreshVisualComposition();return true;
  }

  const visibleEffectColor=value=>{
    const text=String(value??'').trim().toLowerCase();if(!text||text==='transparent')return false;
    const alpha=text.match(/\/\s*([0-9.]+)%?\s*\)$/)||text.match(/,\s*([0-9.]+)\s*\)$/);
    if(alpha){const raw=Number(alpha[1]);const valueAlpha=alpha[0].includes('%')?raw/100:raw;if(Number.isFinite(valueAlpha)&&valueAlpha<=0)return false;}
    if(/^#[0-9a-f]{8}$/i.test(text)&&text.endsWith('00'))return false;
    return true;
  };
  function buildBootState(theme=current){
    const mode=VALID.has(String(theme||'').toLowerCase())?String(theme).toLowerCase():current;
    const profile=profiles.get(activeProfile)||profiles.get('builtin.default');
    const resolved=ThemeContract.resolveProfile(profile,mode);
    const vars={};
    const setVar=(name,value)=>{if(name&&value!==undefined&&value!==null&&value!=='')vars[name]=String(value);};
    const tokens={...(resolved?.material?.base||{}),...(resolved?.motion||{}),...(resolved?.tokens||{})};
    for(const [key,value] of Object.entries(tokens)){const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)setVar(cssVar,cssTokenValue(key,value));}
    for(const role of MATERIAL_ROLES){
      const effective={...(resolved?.material?.base||{}),...(resolved?.material?.roles?.[role]||{})};
      for(const [key,value] of Object.entries(effective))if(MATERIAL_KEYS.includes(key))setVar(roleCssVar(role,key),cssTokenValue(key,value));
      for(const [key,value] of Object.entries(resolved?.appearance?.roles?.[role]||{}))setVar(roleAppearanceCssVar(role,key),value);
    }
    for(const component of COMPONENT_APPEARANCE_COMPONENTS){
      const row=resolved?.appearance?.components?.[component]||{};
      for(const [key,value] of Object.entries(row))if(COMPONENT_APPEARANCE_KEYS.includes(key))setVar(componentAppearanceCssVar(component,key),value);
      for(const [variant,variantRow] of Object.entries(row.variants||{}))for(const [key,value] of Object.entries(variantRow||{}))if(COMPONENT_APPEARANCE_KEYS.includes(key))setVar(componentVariantCssVar(component,variant,key),value);
    }
    for(const [key,value] of Object.entries(resolved?.effects||{})){
      setVar(effectCssVar(key),effectCssValue(key,value));
      if(key==='gradientDirection'){const angle={horizontal:'90deg',vertical:'180deg','diagonal-down':'135deg','diagonal-up':'45deg'}[value]||'90deg';setVar('--dkui-effect-gradient-angle',angle);}
    }
    return Object.freeze({
      theme:mode,profile:profile?.id||'builtin.default',label:profile?.label||'',owner:profile?.owner||'core',
      headerEffect:(visibleEffectColor(resolved?.effects?.headerGradientStart)&&visibleEffectColor(resolved?.effects?.headerGradientEnd))?'true':'false',vars:Object.freeze(vars),
      resolved:Object.freeze({tokens:resolved.tokens,motion:resolved.motion,material:resolved.material,appearance:resolved.appearance,effects:resolved.effects||Object.freeze({}),scientific:resolved.scientific}),
      recipes:computeRecipePolicy(profile,mode),recipeContexts:profile?.recipes?.contexts||Object.freeze({})
    });
  }
  function persistBootState(theme=current){
    try{localStorage.setItem(BOOT_STATE_KEY,JSON.stringify(buildBootState(theme)));}catch{}
  }
  function clearProfileTokens(){const root=document.documentElement;if(!root)return;for(const cssVar of Object.values(PUBLIC_TOKEN_MAP))removeThemeToken(root,cssVar);for(const role of MATERIAL_ROLES){for(const key of MATERIAL_KEYS)removeThemeToken(root,roleCssVar(role,key));for(const key of ThemeContract.roleAppearanceKeys())removeThemeToken(root,roleAppearanceCssVar(role,key));}for(const component of COMPONENT_APPEARANCE_COMPONENTS){for(const key of COMPONENT_APPEARANCE_KEYS)removeThemeToken(root,componentAppearanceCssVar(component,key));for(const variant of COMPONENT_VARIANTS)for(const key of COMPONENT_APPEARANCE_KEYS)removeThemeToken(root,componentVariantCssVar(component,variant,key));}for(const key of EFFECT_KEYS)removeThemeToken(root,effectCssVar(key));removeThemeToken(root,'--dkui-effect-gradient-angle');delete root.dataset.dkdsThemeHeaderEffect;}
  const cssTokenValue=(key,value)=>{if(['materialTintOpacity','materialNoiseOpacity'].includes(key)){const n=Number(value);if(Number.isFinite(n))return `${Math.max(0,Math.min(1,n))*100}%`;}return value;};
  function applyProfileTokens(theme){const root=document.documentElement;if(!root)return;clearProfileTokens();const profile=profiles.get(activeProfile)||profiles.get('builtin.default');const resolved=ThemeContract.resolveProfile(profile,theme);const tokens={...(resolved?.material?.base||{}),...(resolved?.motion||{}),...(resolved?.tokens||{})};for(const [key,value] of Object.entries(tokens)){const cssVar=PUBLIC_TOKEN_MAP[key];if(cssVar)themeToken(root,cssVar,cssTokenValue(key,value));}for(const role of MATERIAL_ROLES){const effective={...(resolved?.material?.base||{}),...(resolved?.material?.roles?.[role]||{})};for(const [key,value] of Object.entries(effective)){if(MATERIAL_KEYS.includes(key))themeToken(root,roleCssVar(role,key),cssTokenValue(key,value));}for(const [key,value] of Object.entries(resolved?.appearance?.roles?.[role]||{})){themeToken(root,roleAppearanceCssVar(role,key),value);}}for(const component of COMPONENT_APPEARANCE_COMPONENTS){const row=resolved?.appearance?.components?.[component]||{};for(const [key,value] of Object.entries(row)){if(COMPONENT_APPEARANCE_KEYS.includes(key))themeToken(root,componentAppearanceCssVar(component,key),value);}for(const [variant,variantRow] of Object.entries(row.variants||{}))for(const [key,value] of Object.entries(variantRow||{}))if(COMPONENT_APPEARANCE_KEYS.includes(key))themeToken(root,componentVariantCssVar(component,variant,key),value);}for(const [key,value] of Object.entries(resolved?.effects||{})){themeToken(root,effectCssVar(key),effectCssValue(key,value));if(key==='gradientDirection'){const angle={horizontal:'90deg',vertical:'180deg','diagonal-down':'135deg','diagonal-up':'45deg'}[value]||'90deg';themeToken(root,'--dkui-effect-gradient-angle',angle);}}root.dataset.dkdsThemeHeaderEffect=(visibleEffectColor(resolved?.effects?.headerGradientStart)&&visibleEffectColor(resolved?.effects?.headerGradientEnd))?'true':'false';applySettingOverrides(profile,theme);root.dataset.dkdsThemeProfile=profile?.id||'builtin.default';if(!pendingProfile||activeProfile===preferredProfile)persistBootState(theme);}
  function snapshotTokens(){const root=document.documentElement;if(!root)return Object.freeze({});const style=getComputedStyle(root),out={};for(const [key,cssVar] of Object.entries(PUBLIC_TOKEN_MAP))out[key]=style.getPropertyValue(cssVar).trim();return Object.freeze(out);}

  let visualTransaction=0;
  function beginVisualTransaction(){const root=document.documentElement;if(!root)return 0;const id=++visualTransaction;root.classList?.add?.('dkds-theme-switching');return id;}
  function endVisualTransaction(id){const root=document.documentElement;if(!root||!id)return;const raf=globalThis.requestAnimationFrame||(typeof globalThis.setTimeout==='function'?((fn)=>globalThis.setTimeout(fn,16)):((fn)=>fn()));raf(()=>raf(()=>{if(id===visualTransaction)root.classList?.remove?.('dkds-theme-switching');}));}
  function refreshVisualComposition(){
    if(!document.body)return;
    try{globalThis.DKDSThemeMaterialRenderer?.refreshDerivedContrast?.();globalThis.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(document,{syncSemantic:false});}catch{}
    try{globalThis.DKDSThemeComponentAppearance?.assign?.(document,{syncSemantic:false});}catch{}
  }

  function apply(theme,{persist=false,emit=true,broadcast=false,nativeSync=false}={}){
    const normalized=String(theme||'').toLowerCase();
    const next=VALID.has(normalized)?normalized:systemTheme();
    const previous=current;current=next;
    const root=document.documentElement,transaction=beginVisualTransaction();
    if(root){root.dataset.dkdsTheme=next;themeProperty(root,'color-scheme',next);if(!canPreservePendingBoot(next)){applyProfileTokens(next);refreshVisualComposition();}}
    if(persist){try{localStorage.setItem(STORAGE_KEY,next);}catch{}}
    else if(!canPreservePendingBoot(next))persistBootState(next);
    if(broadcast){try{channel?.postMessage?.({theme:next,preferredProfile,activeProfile});}catch{}}
    if(nativeSync){try{void native?.appearanceSetTheme?.(next);}catch{}}
    if(emit&&(previous!==next)){try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:next,previous,profile:activeProfile,tokens:snapshotTokens(),visualSynchronized:true}}));}catch{}}
    endVisualTransaction(transaction);return next;
  }
  function set(theme){return apply(theme,{persist:true,emit:true,broadcast:true,nativeSync:true});}
  function toggle(){return set(current==='dark'?'light':'dark');}
  function commitProfile(key,{emit=true,detail={}}={}){
    const next=profiles.has(key)?key:'builtin.default',previous=activeProfile,transaction=beginVisualTransaction();
    activeProfile=next;applyProfileTokens(current);refreshVisualComposition();
    persistBootState(current);
    if(emit&&previous!==next){try{const tokens=snapshotTokens(),shared={profile:next,previous,theme:current,tokens,visualSynchronized:true,...detail};globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed',{detail:shared}));globalThis.dispatchEvent(new CustomEvent('dkds:theme-changed',{detail:{theme:current,previous:current,profile:next,tokens,visualSynchronized:true}}));}catch{}}
    endVisualTransaction(transaction);return Object.freeze({profile:next,previous,changed:previous!==next});
  }
  function registerProfile(id,spec={}){const profile=normalizeProfile(id,spec);profiles.set(profile.id,profile);if(pendingProfile===profile.id||preferredProfile===profile.id&&activeProfile!==profile.id){pendingProfile='';commitProfile(profile.id,{detail:{restored:true}});}else if(activeProfile===profile.id)apply(current,{persist:false,emit:false,broadcast:true});return Object.freeze({id:profile.id,dispose:()=>unregisterProfile(profile.id)});}
  function unregisterProfile(id){const key=String(id||'');if(!key||key==='builtin.default')return false;const existed=profiles.delete(key);if(activeProfile===key){if(preferredProfile===key){pendingProfile=key;activeProfile='builtin.default';if(!restorePendingBootState(current))commitProfile('builtin.default',{detail:{suspended:key}});}else commitProfile('builtin.default',{detail:{suspended:key}});}return existed;}
  function setProfile(id,{persist=true,emit=true,broadcast=true}={}){const key=String(id||'').trim();if(!profiles.has(key))throw new Error(`Unknown theme profile: ${key}`);pendingProfile='';preferredProfile=key;if(persist){try{localStorage.setItem(PROFILE_KEY,key);}catch{}}commitProfile(key,{emit});if(broadcast){try{channel?.postMessage?.({theme:current,preferredProfile:key,activeProfile:key});}catch{}}return key;}
  function listProfiles(){return [...profiles.values()].map(profile=>Object.freeze({id:profile.id,label:profile.label,owner:profile.owner,metadata:profile.metadata,settings:profile.settings.length,recipes:recipePolicy(profile.id)}));}
  function previewProfile(id='',theme=current){
    const requested=String(id||'').trim(),key=requested||activeProfile,mode=VALID.has(String(theme))?String(theme):current;
    if((!requested||key===activeProfile)&&pendingBootMatches(mode)){
      const resolved=bootState.resolved||{};return Object.freeze({id:preferredProfile,label:String(bootState.label||preferredProfile),owner:String(bootState.owner||'boot-cache'),mode,tokens:resolved.tokens||Object.freeze({}),motion:resolved.motion||Object.freeze({}),material:resolved.material||Object.freeze({base:{},roles:{}}),appearance:resolved.appearance||Object.freeze({roles:{},components:{}}),effects:resolved.effects||Object.freeze({}),scientific:resolved.scientific||Object.freeze({}),recipes:recipePolicy('',mode),settings:Object.freeze([]),pending:true});
    }
    const profile=profiles.get(key)||profiles.get('builtin.default'),resolved=ThemeContract.resolveProfile(profile,mode);return Object.freeze({id:profile?.id||'builtin.default',label:profile?.label||'',owner:profile?.owner||'core',mode,tokens:resolved.tokens,motion:resolved.motion,material:resolved.material,appearance:resolved.appearance,effects:resolved.effects||Object.freeze({}),scientific:resolved.scientific,recipes:recipePolicy(profile?.id||'builtin.default',mode),settings:settings(profile?.id||'builtin.default')});
  }
  function materialSnapshot(platform='web'){return ThemeContract.projectMaterial(previewProfile(activeProfile,current).material,platform);}
  function scientificSnapshot(){const scientific=previewProfile(activeProfile,current).scientific||{};return Object.freeze({seriesPalette:Object.freeze([...(scientific.seriesPalette||[])]),mode:scientific.mode||'fallback-only',precedence:Object.freeze(['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default'])});}
  function roleAppearanceSnapshot(){const appearance=previewProfile(activeProfile,current).appearance||{roles:{},components:{}};return Object.freeze({roles:Object.freeze(Object.fromEntries(MATERIAL_ROLES.map(role=>[role,Object.freeze({...appearance.roles?.[role]})]))),components:Object.freeze(Object.fromEntries(COMPONENT_APPEARANCE_COMPONENTS.map(component=>[component,Object.freeze({...appearance.components?.[component]})]))) });}

  apply(current,{persist:false,emit:false});
  try{
    if(typeof BroadcastChannel==='function'){
      channel=new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message',event=>{const next=String(event?.data?.theme||'').toLowerCase(),profile=String(event?.data?.preferredProfile||event?.data?.profile||'');let profileChanged=false;if(profile){preferredProfile=profile;try{localStorage.setItem(PROFILE_KEY,profile);}catch{}if(profiles.has(profile)){pendingProfile='';if(profile!==activeProfile)profileChanged=commitProfile(profile).changed;}else{pendingProfile=profile;if(activeProfile!=='builtin.default')profileChanged=commitProfile('builtin.default',{detail:{pending:profile}}).changed;}}if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true});else if(profile&&!profileChanged&&profiles.has(profile)&&activeProfile===profile)refreshVisualComposition();});
    }
  }catch{}
  try{globalThis.addEventListener?.('storage',event=>{if(event?.key===STORAGE_KEY){const next=String(event.newValue||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:false,emit:true});}else if(event?.key===PROFILE_KEY){const next=String(event.newValue||'').trim()||'builtin.default';preferredProfile=next;if(profiles.has(next)){pendingProfile='';if(next!==activeProfile)setProfile(next,{persist:false,broadcast:false});}else{pendingProfile=next;if(activeProfile!=='builtin.default')commitProfile('builtin.default',{detail:{pending:next}});}}});}catch{}
  try{
    if(typeof native?.onAppearanceThemeChanged==='function')nativeOff=native.onAppearanceThemeChanged(theme=>{const next=String(theme||'').toLowerCase();if(VALID.has(next)&&next!==current)apply(next,{persist:true,emit:true,broadcast:true});});
    if(typeof native?.appearanceGetTheme==='function'){
      Promise.resolve(native.appearanceGetTheme()).then(remote=>{const next=String(remote||'').toLowerCase();if(bootTheme){if(next!==current)void native.appearanceSetTheme?.(current);}else if(VALID.has(next))apply(next,{persist:true,emit:true,broadcast:true});else void native.appearanceSetTheme?.(current);}).catch(()=>{});
    }
  }catch{}

  function rendererCapabilities(){return globalThis.DKDSThemeMaterialRenderer?.capabilities?.()||Object.freeze({version:'0.0.0',recipeInstalled:false,engine:{},renderer:{backdropBlur:false,saturation:false,noise:false,glassEdge:false,innerHighlight:false,specularHighlight:false,webMaterial:false,nativeBlur:false,thinGlass:false,nonUniformBlur:false,edgeRefraction:false,dynamicSpecular:false,liquidGlass:false},recipes:{clear:false,'thin-glass':false,'soft-glass':false,'liquid-glass':false},roles:{},materialContexts:[]});}
  function supports(feature){const key=String(feature||'').trim();if(!key)return false;if(key.startsWith('renderer.'))return globalThis.DKDSThemeMaterialRenderer?.supports?.(key)===true;return ThemeContract.supports(key);}

  window.DKDSTheme=Object.freeze({version:'3.10.0',contractVersion:'3.10.0',supports,rendererCapabilities,current:()=>current,system:systemTheme,set,toggle,isDark:()=>current==='dark',profile:()=>activeProfile,preferredProfile:()=>preferredProfile,setProfile,registerProfile,unregisterProfile,listProfiles,settings,setSetting,resetSettings,recipePolicy,recipeFor,tokens:snapshotTokens,tokenNames:()=>TOKEN_KEYS.slice(),materialRoles:()=>MATERIAL_ROLES.slice(),materialContexts:()=>MATERIAL_CONTEXTS.slice(),componentContexts:()=>COMPONENT_CONTEXTS.slice(),materials:materialSnapshot,materialFor:(role,context)=>ThemeContract.resolveMaterialContext(previewProfile(activeProfile,current).material,role,context),appearanceRoles:roleAppearanceSnapshot,appearanceComponents:()=>roleAppearanceSnapshot().components,effects:()=>previewProfile(activeProfile,current).effects,consumption:()=>globalThis.DKDSThemeComponentAppearance?.consumption?.()||Object.freeze({version:'0.0.0',components:{}}),scientific:scientificSnapshot,platformUnits:()=>ThemeContract.platformUnits,preview:previewProfile,coverage:()=>globalThis.DKDSThemeCoverage?.scan?.()||Object.freeze({version:'0.0.0',summary:{ok:false,reason:'Theme Coverage Runtime unavailable'}})});
  globalThis.addEventListener?.('beforeunload',()=>{try{nativeOff?.();channel?.close?.();}catch{}},{once:true});
})();
