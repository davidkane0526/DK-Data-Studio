(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DKDSThemeContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='3.10.0';
  const MIN_COMPATIBLE_CONTRACT_VERSION='3.6.0';
  const MATERIAL_ROLES=Object.freeze(['chrome','sidebar','surface','elevated','popover','control','floating']);
  const MATERIAL_RECIPES=Object.freeze(['clear','thin-glass','soft-glass','liquid-glass']);
  const MATERIAL_CONTEXTS=Object.freeze(['compact','panel','dialog','workspace-modal']);
  const COMPONENT_CONTEXTS=Object.freeze(['standalone','grouped']);
  const APPEARANCE_KEYS=Object.freeze([
    'canvas','surface','surfaceSoft','surfaceHover','surfaceElevated','surfaceSidebar','controlBg','controlHover',
    'divider','dividerHover','controlBorder','controlBorderHover','scrollbar','scrollbarHover','text','textSoft','muted',
    'accent','accentHover','accentSoft','accentAlt','accentAltHover','accentAltSoft','focus',
    'success','successSoft','warning','warningSoft','danger','dangerSoft','info','infoSoft',
    'selectionSurface','selectionText','selectionBorder','activeSurface','activeText','disabledSurface','disabledText',
    'shadow1','shadow2','shadowFloat','radius','radiusLg'
  ]);
  const MOTION_KEYS=Object.freeze(['motionFast','motionNormal','motionSlow','easeStandard','easeEmphasized','hoverLift','pressScale']);
  const MATERIAL_KEYS=Object.freeze(['materialBlur','materialBlurStrong','materialSaturation','materialTintOpacity','specularHighlight','innerHighlight','glassEdge','materialNoiseOpacity']);
  const ROLE_APPEARANCE_KEYS=Object.freeze(['surface','border','text']);
  const COMPONENT_APPEARANCE_COMPONENTS=Object.freeze(['tab','toolbarAction','toolbarGroup','panelHeader','inspectorHeader','menuItem','chip','statusBar','floatingChrome','field']);
  const COMPONENT_APPEARANCE_COLOR_KEYS=Object.freeze(['surface','surfaceHover','surfaceActive','surfaceSelected','text','textSoft','textActive','textSelected','border','borderHover','borderActive','indicator']);
  const COMPONENT_APPEARANCE_DEPTH_KEYS=Object.freeze(['shadow','shadowHover','shadowActive','shadowSelected','radius']);
  const COMPONENT_APPEARANCE_KEYS=Object.freeze([...COMPONENT_APPEARANCE_COLOR_KEYS,...COMPONENT_APPEARANCE_DEPTH_KEYS]);
  const COMPONENT_VARIANTS=Object.freeze(['primary','secondary','selected','active','quiet','destructive','info','success','warning','danger']);
  const COMPONENT_VARIANT_MAP=Object.freeze({
    tab:Object.freeze(['selected','active','quiet']),
    toolbarAction:Object.freeze(['primary','secondary','selected','active','quiet','destructive']),
    toolbarGroup:Object.freeze(['quiet']),
    panelHeader:Object.freeze(['active','quiet']),
    inspectorHeader:Object.freeze(['active','quiet']),
    menuItem:Object.freeze(['selected','active','quiet','destructive']),
    chip:Object.freeze(['selected','active','quiet','info','success','warning','danger']),
    statusBar:Object.freeze(['quiet']),
    floatingChrome:Object.freeze(['active','quiet']),
    field:Object.freeze(['active','quiet'])
  });
  const EFFECT_KEYS=Object.freeze(['headerGradientStart','headerGradientEnd','accentGlow','edgeGlow','ambientTint','glowIntensity','glowRadius','gradientDirection']);
  const SCIENTIFIC_KEYS=Object.freeze(['seriesPalette','mode']);
  const TOKEN_KEYS=Object.freeze([...APPEARANCE_KEYS,...MOTION_KEYS,...MATERIAL_KEYS]);
  const COLOR_KEYS=new Set(['canvas','surface','surfaceSoft','surfaceHover','surfaceElevated','surfaceSidebar','controlBg','controlHover','divider','dividerHover','controlBorder','controlBorderHover','scrollbar','scrollbarHover','text','textSoft','muted','accent','accentHover','accentSoft','accentAlt','accentAltHover','accentAltSoft','focus','success','successSoft','warning','warningSoft','danger','dangerSoft','info','infoSoft','selectionSurface','selectionText','selectionBorder','activeSurface','activeText','disabledSurface','disabledText','specularHighlight','innerHighlight','glassEdge']);
  const SHADOW_KEYS=new Set(['shadow1','shadow2','shadowFloat']);
  const DURATION_KEYS=new Set(['motionFast','motionNormal','motionSlow']);
  const RADIUS_KEYS=new Set(['radius','radiusLg']);
  const MATERIAL_BLUR_KEYS=new Set(['materialBlur','materialBlurStrong']);
  const OPACITY_KEYS=new Set(['materialTintOpacity','materialNoiseOpacity']);
  const ROOT_KEYS=new Set(['label','owner','metadata','modes','motion','material','appearance','effects','scientific','recipes','settings']);

  function fail(message,path='theme'){const error=new Error(`${path}: ${message}`);error.code='THEME_CONTRACT_VALIDATION';throw error;}
  function finiteNumber(value,path){const n=Number(value);if(!Number.isFinite(n))fail('must be a finite number',path);return n;}
  function clampRange(n,min,max,path,label='value'){if(n<min||n>max)fail(`${label} must be between ${min} and ${max}`,path);return n;}
  function fmt(n){return Number(n.toFixed(4)).toString();}

  function parseColor(value,path){
    if(typeof value!=='string')fail('must be a color string',path);
    const s=value.trim();
    if(/^#[0-9a-f]{3,4}$/i.test(s)||/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(s))return s;
    if(s==='transparent')return s;
    let m=s.match(/^rgba?\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,\)]+)(?:\s*,\s*([^\)]+))?\s*\)$/i);
    if(m){
      for(let i=1;i<=3;i++){
        const part=m[i].trim();
        if(part.endsWith('%'))clampRange(finiteNumber(part.slice(0,-1),path),0,100,path,'RGB percentage');
        else clampRange(finiteNumber(part,path),0,255,path,'RGB channel');
      }
      if(m[4]!==undefined){const a=m[4].trim();a.endsWith('%')?clampRange(finiteNumber(a.slice(0,-1),path),0,100,path,'alpha percentage'):clampRange(finiteNumber(a,path),0,1,path,'alpha');}
      return s;
    }
    m=s.match(/^hsla?\(\s*([^,]+)\s*,\s*([^,]+)%\s*,\s*([^,]+)%(?:\s*,\s*([^\)]+))?\s*\)$/i);
    if(m){finiteNumber(m[1],path);clampRange(finiteNumber(m[2],path),0,100,path,'saturation');clampRange(finiteNumber(m[3],path),0,100,path,'lightness');if(m[4]!==undefined){const a=m[4].trim();a.endsWith('%')?clampRange(finiteNumber(a.slice(0,-1),path),0,100,path,'alpha percentage'):clampRange(finiteNumber(a,path),0,1,path,'alpha');}return s;}
    fail('must be hex, rgb()/rgba(), hsl()/hsla(), or transparent',path);
  }
  function parseLength(value,path,{min=0,max=128}={}){return `${fmt(clampRange(finiteNumber(value,path),min,max,path,'length'))}px`;}
  function parseDuration(value,path){return `${fmt(clampRange(finiteNumber(value,path),0,5000,path,'duration'))}ms`;}
  function parseOpacity(value,path){return `${fmt(clampRange(finiteNumber(value,path),0,1,path,'opacity')*100)}%`;}
  function parseSaturation(value,path){return fmt(clampRange(finiteNumber(value,path),0,3,path,'saturation'));}
  function parseScale(value,path){return fmt(clampRange(finiteNumber(value,path),0.8,1.2,path,'scale'));}
  function parseEasing(value,path){
    const s=String(value??'').trim();if(['linear','ease','ease-in','ease-out','ease-in-out'].includes(s))return s;
    const m=s.match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/i);
    if(!m)fail('must be a standard easing keyword or cubic-bezier(x1,y1,x2,y2)',path);
    const x1=finiteNumber(m[1],path),y1=finiteNumber(m[2],path),x2=finiteNumber(m[3],path),y2=finiteNumber(m[4],path);clampRange(x1,0,1,path,'cubic-bezier x1');clampRange(x2,0,1,path,'cubic-bezier x2');
    return `cubic-bezier(${fmt(x1)},${fmt(y1)},${fmt(x2)},${fmt(y2)})`;
  }
  function parseShadow(value,path){
    const s=String(value??'').trim();if(!s)fail('must not be empty',path);if(s==='none')return s;if(s.length>320)fail('shadow is too long',path);
    if(/[;{}@]/.test(s)||/\b(?:url|var|calc|env|expression|attr)\s*\(/i.test(s))fail('shadow may only contain literal lengths, inset and literal colors',path);
    const layers=s.split(/,(?![^()]*\))/).map(row=>row.trim()).filter(Boolean);if(!layers.length||layers.length>4)fail('shadow supports 1..4 literal layers',path);
    for(const layer of layers){if(!/^(?:inset\s+)?(?:0|-?[\d.]+px)\s+(?:0|-?[\d.]+px)(?:\s+(?:0|-?[\d.]+px)){0,2}\s+(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(layer))fail('shadow layer must be: [inset] x y [blur] [spread] <literal-color>',path);}
    return s;
  }
  function parseToken(key,value,path=`theme.${key}`){
    if(!TOKEN_KEYS.includes(key))fail(`unknown Theme token "${key}"`,path);
    if(COLOR_KEYS.has(key))return parseColor(value,path);
    if(SHADOW_KEYS.has(key))return parseShadow(value,path);
    if(RADIUS_KEYS.has(key))return parseLength(value,path,{min:0,max:64});
    if(DURATION_KEYS.has(key))return parseDuration(value,path);
    if(key==='hoverLift')return parseLength(value,path,{min:-16,max:16});
    if(key==='pressScale')return parseScale(value,path);
    if(key==='easeStandard'||key==='easeEmphasized')return parseEasing(value,path);
    if(MATERIAL_BLUR_KEYS.has(key))return parseLength(value,path,{min:0,max:64});
    if(OPACITY_KEYS.has(key))return parseOpacity(value,path);
    if(key==='materialSaturation')return parseSaturation(value,path);
    fail(`no parser registered for Theme token "${key}"`,path);
  }
  function object(value,path){if(!value||typeof value!=='object'||Array.isArray(value))fail('must be an object',path);return value;}
  function rejectUnknown(obj,allowed,path){for(const key of Object.keys(obj))if(!allowed.has(key))fail(`unknown property "${key}"`,`${path}.${key}`);}
  function normalizeTokenObject(value,keys,path){if(value===undefined)return {};const obj=object(value,path);const allowed=new Set(keys);rejectUnknown(obj,allowed,path);const out={};for(const [key,row] of Object.entries(obj))out[key]=parseToken(key,row,`${path}.${key}`);return out;}
  function normalizeMaterialContextMap(value,path){
    const out={};if(value===undefined)return Object.freeze(out);const obj=object(value,path);rejectUnknown(obj,new Set(MATERIAL_CONTEXTS),path);
    for(const context of MATERIAL_CONTEXTS)if(obj[context]!==undefined)out[context]=Object.freeze(normalizeTokenObject(obj[context],MATERIAL_KEYS,`${path}.${context}`));
    return Object.freeze(out);
  }
  function normalizeMaterial(value,path){
    if(value===undefined)return Object.freeze({base:Object.freeze({}),roles:Object.freeze({}),contexts:Object.freeze({}),roleContexts:Object.freeze({})});
    const obj=object(value,path),allowed=new Set([...MATERIAL_KEYS,'roles','contexts']);rejectUnknown(obj,allowed,path);
    const base={};for(const key of MATERIAL_KEYS)if(obj[key]!==undefined)base[key]=parseToken(key,obj[key],`${path}.${key}`);
    const contexts=normalizeMaterialContextMap(obj.contexts,`${path}.contexts`),roles={},roleContexts={};
    if(obj.roles!==undefined){
      const roleObj=object(obj.roles,`${path}.roles`);rejectUnknown(roleObj,new Set(MATERIAL_ROLES),`${path}.roles`);
      for(const role of MATERIAL_ROLES)if(roleObj[role]!==undefined){
        const row=object(roleObj[role],`${path}.roles.${role}`);rejectUnknown(row,new Set([...MATERIAL_KEYS,'contexts']),`${path}.roles.${role}`);
        const values={};for(const key of MATERIAL_KEYS)if(row[key]!==undefined)values[key]=parseToken(key,row[key],`${path}.roles.${role}.${key}`);roles[role]=Object.freeze(values);
        const scoped=normalizeMaterialContextMap(row.contexts,`${path}.roles.${role}.contexts`);if(Object.keys(scoped).length)roleContexts[role]=scoped;
      }
    }
    return Object.freeze({base:Object.freeze(base),roles:Object.freeze(roles),contexts,roleContexts:Object.freeze(roleContexts)});
  }
  function normalizeMotion(value,path){return Object.freeze(normalizeTokenObject(value,MOTION_KEYS,path));}
  function normalizeEffects(value,path){
    if(value===undefined)return Object.freeze({});
    const obj=object(value,path);rejectUnknown(obj,new Set(EFFECT_KEYS),path);const out={};
    for(const key of ['headerGradientStart','headerGradientEnd','accentGlow','edgeGlow','ambientTint'])if(obj[key]!==undefined)out[key]=parseColor(obj[key],`${path}.${key}`);
    if(obj.glowIntensity!==undefined)out.glowIntensity=parseOpacity(obj.glowIntensity,`${path}.glowIntensity`);
    if(obj.glowRadius!==undefined)out.glowRadius=parseLength(obj.glowRadius,`${path}.glowRadius`,{min:0,max:48});
    if(obj.gradientDirection!==undefined){const direction=String(obj.gradientDirection||'').trim();if(!['horizontal','vertical','diagonal-down','diagonal-up'].includes(direction))fail('gradientDirection must be horizontal, vertical, diagonal-down, or diagonal-up',`${path}.gradientDirection`);out.gradientDirection=direction;}
    return Object.freeze(out);
  }

  function parseComponentAppearanceValue(key,value,path){
    if(COMPONENT_APPEARANCE_COLOR_KEYS.includes(key))return parseColor(value,path);
    if(key==='radius')return parseLength(value,path,{min:0,max:64});
    if(COMPONENT_APPEARANCE_DEPTH_KEYS.includes(key))return parseShadow(value,path);
    fail(`unknown component appearance slot "${key}"`,path);
  }
  function normalizeComponentLeaf(value,component,path,{allowContexts=false}={}){
    const row=object(value,path),allowed=new Set([...COMPONENT_APPEARANCE_KEYS,'variants',...(allowContexts?['contexts']:[])]);rejectUnknown(row,allowed,path);
    const out={};for(const key of COMPONENT_APPEARANCE_KEYS)if(row[key]!==undefined)out[key]=parseComponentAppearanceValue(key,row[key],`${path}.${key}`);
    const allowedVariants=new Set(COMPONENT_VARIANT_MAP[component]||[]),variants={};
    if(row.variants!==undefined){const variantObj=object(row.variants,`${path}.variants`);rejectUnknown(variantObj,allowedVariants,`${path}.variants`);for(const variant of allowedVariants){if(variantObj[variant]===undefined)continue;const variantRow=object(variantObj[variant],`${path}.variants.${variant}`);rejectUnknown(variantRow,new Set(COMPONENT_APPEARANCE_KEYS),`${path}.variants.${variant}`);const variantOut={};for(const key of COMPONENT_APPEARANCE_KEYS)if(variantRow[key]!==undefined)variantOut[key]=parseComponentAppearanceValue(key,variantRow[key],`${path}.variants.${variant}.${key}`);variants[variant]=Object.freeze(variantOut);}}
    if(Object.keys(variants).length)out.variants=Object.freeze(variants);
    if(allowContexts&&row.contexts!==undefined){const contextsObj=object(row.contexts,`${path}.contexts`);rejectUnknown(contextsObj,new Set(COMPONENT_CONTEXTS),`${path}.contexts`);const contexts={};for(const context of COMPONENT_CONTEXTS)if(contextsObj[context]!==undefined)contexts[context]=Object.freeze(normalizeComponentLeaf(contextsObj[context],component,`${path}.contexts.${context}`));if(Object.keys(contexts).length)out.contexts=Object.freeze(contexts);}
    return Object.freeze(out);
  }
  function normalizeAppearance(value,path){
    if(value===undefined)return Object.freeze({roles:Object.freeze({}),components:Object.freeze({})});
    const obj=object(value,path);rejectUnknown(obj,new Set(['roles','components']),path);
    const roles={};
    if(obj.roles!==undefined){
      const roleObj=object(obj.roles,`${path}.roles`);rejectUnknown(roleObj,new Set(MATERIAL_ROLES),`${path}.roles`);
      for(const role of MATERIAL_ROLES){if(roleObj[role]===undefined)continue;const row=object(roleObj[role],`${path}.roles.${role}`);rejectUnknown(row,new Set(ROLE_APPEARANCE_KEYS),`${path}.roles.${role}`);const out={};for(const key of ROLE_APPEARANCE_KEYS)if(row[key]!==undefined)out[key]=parseColor(row[key],`${path}.roles.${role}.${key}`);roles[role]=Object.freeze(out);}
    }
    const components={};
    if(obj.components!==undefined){
      const componentObj=object(obj.components,`${path}.components`);rejectUnknown(componentObj,new Set(COMPONENT_APPEARANCE_COMPONENTS),`${path}.components`);
      for(const component of COMPONENT_APPEARANCE_COMPONENTS){
        if(componentObj[component]===undefined)continue;
        const row=object(componentObj[component],`${path}.components.${component}`),allowed=new Set([...COMPONENT_APPEARANCE_KEYS,'variants','contexts','roles']);rejectUnknown(row,allowed,`${path}.components.${component}`);
        const baseRow=Object.fromEntries(Object.entries(row).filter(([key])=>key!=='roles'));const out={...normalizeComponentLeaf(baseRow,component,`${path}.components.${component}`,{allowContexts:true})};
        if(row.roles!==undefined){const roleObj=object(row.roles,`${path}.components.${component}.roles`);rejectUnknown(roleObj,new Set(MATERIAL_ROLES),`${path}.components.${component}.roles`);const roleRows={};for(const role of MATERIAL_ROLES)if(roleObj[role]!==undefined)roleRows[role]=Object.freeze(normalizeComponentLeaf(roleObj[role],component,`${path}.components.${component}.roles.${role}`,{allowContexts:true}));if(Object.keys(roleRows).length)out.roles=Object.freeze(roleRows);}
        components[component]=Object.freeze(out);
      }
    }
    return Object.freeze({roles:Object.freeze(roles),components:Object.freeze(components)});
  }
  function mergeVariantRows(a={},b={}){const out={...a};for(const [variant,row] of Object.entries(b||{}))out[variant]=Object.freeze({...(out[variant]||{}),...row});return Object.freeze(out);}
  function mergeContextRows(a={},b={}){const out={...a};for(const [context,row] of Object.entries(b||{})){const prev=out[context]||{};const merged={...prev,...row};if(prev.variants||row.variants)merged.variants=mergeVariantRows(prev.variants,row.variants);out[context]=Object.freeze(merged);}return Object.freeze(out);}
  function mergeComponentRow(a={},b={}){const merged={...a,...b};if(a.variants||b.variants)merged.variants=mergeVariantRows(a.variants,b.variants);if(a.contexts||b.contexts)merged.contexts=mergeContextRows(a.contexts,b.contexts);if(a.roles||b.roles){const roles={...a.roles};for(const [role,row] of Object.entries(b.roles||{}))roles[role]=Object.freeze(mergeComponentRow(roles[role]||{},row));merged.roles=Object.freeze(roles);}return Object.freeze(merged);}
  function normalizeScientific(value,path){
    if(value===undefined)return Object.freeze({seriesPalette:Object.freeze([]),mode:''});
    const obj=object(value,path);rejectUnknown(obj,new Set(SCIENTIFIC_KEYS),path);
    let palette=[];
    if(obj.seriesPalette!==undefined){
      if(!Array.isArray(obj.seriesPalette))fail('seriesPalette must be an array',`${path}.seriesPalette`);
      if(obj.seriesPalette.length<2||obj.seriesPalette.length>32)fail('seriesPalette must contain 2..32 colors',`${path}.seriesPalette`);
      palette=obj.seriesPalette.map((value,index)=>parseColor(value,`${path}.seriesPalette[${index}]`));
    }
    const mode=obj.mode===undefined?'':String(obj.mode||'').trim();
    if(mode&&mode!=='fallback-only')fail('scientific.mode must be "fallback-only"',`${path}.mode`);
    return Object.freeze({seriesPalette:Object.freeze(palette),mode});
  }
  function mergeAppearanceRoles(base={},override={}){const out={};for(const role of MATERIAL_ROLES){const merged={...(base[role]||{}),...(override[role]||{})};if(Object.keys(merged).length)out[role]=Object.freeze(merged);}return Object.freeze(out);}
  function mergeAppearanceComponents(base={},override={}){const out={};for(const component of COMPONENT_APPEARANCE_COMPONENTS){const merged=mergeComponentRow(base[component]||{},override[component]||{});if(Object.keys(merged).length)out[component]=merged;}return Object.freeze(out);}
  function normalizeMode(value,path){
    if(value===undefined)return Object.freeze({tokens:Object.freeze({}),motion:Object.freeze({}),material:Object.freeze({base:Object.freeze({}),roles:Object.freeze({}),contexts:Object.freeze({}),roleContexts:Object.freeze({})}),appearance:Object.freeze({roles:Object.freeze({}),components:Object.freeze({})}),effects:Object.freeze({}),scientific:Object.freeze({seriesPalette:Object.freeze([]),mode:''})});
    const obj=object(value,path);rejectUnknown(obj,new Set(['tokens','motion','material','appearance','effects','scientific']),path);
    return Object.freeze({tokens:Object.freeze(normalizeTokenObject(obj.tokens,APPEARANCE_KEYS,`${path}.tokens`)),motion:normalizeMotion(obj.motion,`${path}.motion`),material:normalizeMaterial(obj.material,`${path}.material`),appearance:normalizeAppearance(obj.appearance,`${path}.appearance`),effects:normalizeEffects(obj.effects,`${path}.effects`),scientific:normalizeScientific(obj.scientific,`${path}.scientific`)});
  }
  function mergeRoles(base={},override={},keys=MATERIAL_ROLES){const out={};for(const role of keys){const merged={...(base?.[role]||{}),...(override?.[role]||{})};if(Object.keys(merged).length)out[role]=Object.freeze(merged);}return Object.freeze(out);}

  function normalizeRecipes(value,path){
    if(value===undefined)return Object.freeze({});
    const obj=object(value,path);rejectUnknown(obj,new Set([...MATERIAL_ROLES,'contexts']),path);const out={};
    for(const role of MATERIAL_ROLES)if(obj[role]!==undefined){const recipe=String(obj[role]||'').trim();if(!MATERIAL_RECIPES.includes(recipe))fail(`must be one of ${MATERIAL_RECIPES.join(', ')}`,`${path}.${role}`);out[role]=recipe;}
    if(obj.contexts!==undefined){const contextsObj=object(obj.contexts,`${path}.contexts`);rejectUnknown(contextsObj,new Set(MATERIAL_CONTEXTS),`${path}.contexts`);const contexts={};for(const context of MATERIAL_CONTEXTS)if(contextsObj[context]!==undefined){const roleObj=object(contextsObj[context],`${path}.contexts.${context}`);rejectUnknown(roleObj,new Set(MATERIAL_ROLES),`${path}.contexts.${context}`);const rows={};for(const role of MATERIAL_ROLES)if(roleObj[role]!==undefined){const recipe=String(roleObj[role]||'').trim();if(!MATERIAL_RECIPES.includes(recipe))fail(`must be one of ${MATERIAL_RECIPES.join(', ')}`,`${path}.contexts.${context}.${role}`);rows[role]=recipe;}contexts[context]=Object.freeze(rows);}out.contexts=Object.freeze(contexts);}
    return Object.freeze(out);
  }
  function normalizeSettingTarget(value,path){
    const obj=object(value,path),allowed=new Set(['scope','key','role','mode']);rejectUnknown(obj,allowed,path);
    const scope=String(obj.scope||'').trim(),mode=String(obj.mode||'all').trim();if(!['token','motion','material','recipe'].includes(scope))fail('scope must be token, motion, material, or recipe',`${path}.scope`);if(!['all','light','dark'].includes(mode))fail('mode must be all, light, or dark',`${path}.mode`);
    const role=String(obj.role||'').trim(),key=String(obj.key||'').trim();
    if(scope==='token'&&!APPEARANCE_KEYS.includes(key))fail(`unknown appearance token "${key}"`,`${path}.key`);
    if(scope==='motion'&&!MOTION_KEYS.includes(key))fail(`unknown motion token "${key}"`,`${path}.key`);
    if(scope==='material'&&!MATERIAL_KEYS.includes(key))fail(`unknown material token "${key}"`,`${path}.key`);
    if((scope==='material'||scope==='recipe')&&role&&!MATERIAL_ROLES.includes(role))fail(`unknown material role "${role}"`,`${path}.role`);
    if(scope==='recipe'&&!role)fail('recipe target requires role',`${path}.role`);
    return Object.freeze({scope,key,role,mode});
  }
  function normalizeSettings(value,path){
    if(value===undefined)return Object.freeze([]);if(!Array.isArray(value))fail('must be an array',path);if(value.length>48)fail('supports at most 48 controls',path);
    const ids=new Set(),rows=value.map((row,index)=>{
      const item=object(row,`${path}[${index}]`),allowed=new Set(['id','label','description','target','type','min','max','step','options']);rejectUnknown(item,allowed,`${path}[${index}]`);
      const id=String(item.id||'').trim();if(!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(id))fail('id must be a stable identifier',`${path}[${index}].id`);if(ids.has(id))fail(`duplicate setting id "${id}"`,`${path}[${index}].id`);ids.add(id);
      const label=String(item.label||id),description=String(item.description||''),target=normalizeSettingTarget(item.target,`${path}[${index}].target`),type=String(item.type||'range');if(!['range','number','select'].includes(type))fail('type must be range, number, or select',`${path}[${index}].type`);
      let min=item.min,max=item.max,step=item.step,options=[];
      if(type==='range'||type==='number'){
        if(min!==undefined)min=finiteNumber(min,`${path}[${index}].min`);if(max!==undefined)max=finiteNumber(max,`${path}[${index}].max`);if(step!==undefined){step=finiteNumber(step,`${path}[${index}].step`);if(step<=0)fail('step must be > 0',`${path}[${index}].step`);}if(min!==undefined&&max!==undefined&&min>max)fail('min must be <= max',`${path}[${index}]`);
      }
      if(type==='select'){
        if(!Array.isArray(item.options)||!item.options.length)fail('select requires options',`${path}[${index}].options`);options=item.options.map((opt,i)=>{const o=typeof opt==='string'?{value:opt,label:opt}:object(opt,`${path}[${index}].options[${i}]`);const value=String(o.value??'').trim();if(!value)fail('option value required',`${path}[${index}].options[${i}].value`);return Object.freeze({value,label:String(o.label??value)});});
      }
      if(target.scope==='recipe'){
        if(type!=='select')fail('recipe settings must use select controls',`${path}[${index}].type`);for(const opt of options)if(!MATERIAL_RECIPES.includes(opt.value))fail(`recipe option must be one of ${MATERIAL_RECIPES.join(', ')}`,`${path}[${index}].options`);
      }else if(type==='select'){for(const opt of options)parseToken(target.key,opt.value,`${path}[${index}].options`);}
      else if(type==='range'||type==='number'){
        if(min!==undefined)parseToken(target.key,min,`${path}[${index}].min`);if(max!==undefined)parseToken(target.key,max,`${path}[${index}].max`);
      }
      return Object.freeze({id,label,description,target,type,min,max,step,options:Object.freeze(options)});
    });
    return Object.freeze(rows);
  }

  function validateProfile(spec,path='theme.profile'){
    const obj=object(spec,path);rejectUnknown(obj,ROOT_KEYS,path);
    if(obj.label!==undefined&&typeof obj.label!=='string')fail('label must be a string',`${path}.label`);
    if(obj.owner!==undefined&&typeof obj.owner!=='string')fail('owner must be a string',`${path}.owner`);
    if(obj.metadata!==undefined)object(obj.metadata,`${path}.metadata`);
    const sharedMotion=normalizeMotion(obj.motion,`${path}.motion`),sharedMaterial=normalizeMaterial(obj.material,`${path}.material`),sharedAppearance=normalizeAppearance(obj.appearance,`${path}.appearance`),sharedEffects=normalizeEffects(obj.effects,`${path}.effects`),sharedScientific=normalizeScientific(obj.scientific,`${path}.scientific`),recipes=normalizeRecipes(obj.recipes,`${path}.recipes`),settings=normalizeSettings(obj.settings,`${path}.settings`);
    const modesObj=object(obj.modes,`${path}.modes`);rejectUnknown(modesObj,new Set(['light','dark']),`${path}.modes`);
    if(modesObj.light===undefined||modesObj.dark===undefined)fail('must declare both light and dark modes',`${path}.modes`);
    return Object.freeze({label:obj.label,owner:obj.owner,metadata:Object.freeze({...obj.metadata}),motion:sharedMotion,material:sharedMaterial,appearance:sharedAppearance,effects:sharedEffects,scientific:sharedScientific,recipes,settings,modes:Object.freeze({light:normalizeMode(modesObj.light,`${path}.modes.light`),dark:normalizeMode(modesObj.dark,`${path}.modes.dark`)})});
  }
  function resolveProfile(profile,mode){
    const branch=profile?.modes?.[mode]||{tokens:{},motion:{},material:{base:{},roles:{},contexts:{},roleContexts:{}},appearance:{roles:{},components:{}},effects:{},scientific:{seriesPalette:[],mode:''}};
    const branchPalette=branch.scientific?.seriesPalette||[];
    const scientificMode=branch.scientific?.mode||profile.scientific?.mode||'fallback-only';
    return Object.freeze({tokens:Object.freeze({...branch.tokens}),motion:Object.freeze({...profile.motion,...branch.motion}),material:Object.freeze({base:Object.freeze({...profile.material.base,...branch.material.base}),roles:mergeRoles(profile.material.roles,branch.material.roles),contexts:mergeRoles(profile.material.contexts,branch.material.contexts,MATERIAL_CONTEXTS),roleContexts:Object.freeze(Object.fromEntries(MATERIAL_ROLES.map(role=>[role,mergeRoles(profile.material.roleContexts?.[role],branch.material.roleContexts?.[role],MATERIAL_CONTEXTS)]).filter(([,row])=>Object.keys(row).length)))}),appearance:Object.freeze({roles:mergeAppearanceRoles(profile.appearance?.roles,branch.appearance?.roles),components:mergeAppearanceComponents(profile.appearance?.components,branch.appearance?.components)}),effects:Object.freeze({...profile.effects,...branch.effects}),scientific:Object.freeze({seriesPalette:Object.freeze(branchPalette.length?branchPalette:[...(profile.scientific?.seriesPalette||[])]),mode:scientificMode}),recipes:Object.freeze({...profile.recipes}),settings:profile.settings||Object.freeze([])});
  }
  function contractVersionSupported(value){
    const parse=v=>{const m=String(v||'').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);return m?m.slice(1).map(Number):null;};
    const requested=parse(value),minimum=parse(MIN_COMPATIBLE_CONTRACT_VERSION),current=parse(VERSION);
    if(!requested||!minimum||!current||requested[0]!==current[0])return false;
    const cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
    return cmp(requested,minimum)>=0&&cmp(requested,current)<=0;
  }
  function supports(name){
    const key=String(name||'').trim();if(!key)return false;
    if(key.startsWith('contract:'))return contractVersionSupported(key.slice('contract:'.length));
    if(!key.startsWith('contract.'))return false;
    const scoped=key.slice('contract.'.length);
    if(TOKEN_KEYS.includes(scoped))return true;
    if(['theme','theme.profile','theme.settings','material.recipes','motion','material','material.roles','modes.tokens','modes.motion','modes.material','platform.logical-units','platform.native-projection','theme.coverage','theme.render-coverage','theme.style-audit','appearance.roles','appearance.components','appearance.variants','appearance.component-contexts','appearance.material-role-composition','material.contexts','material.context-recipes','effects','effects.controlled','scientific','scientific.seriesPalette','scientific.precedence'].includes(scoped))return true;
    if(scoped.startsWith('material.roles.'))return MATERIAL_ROLES.includes(scoped.slice('material.roles.'.length));
    if(scoped.startsWith('appearance.roles.'))return MATERIAL_ROLES.includes(scoped.slice('appearance.roles.'.length));
    if(scoped.startsWith('appearance.components.'))return COMPONENT_APPEARANCE_COMPONENTS.includes(scoped.slice('appearance.components.'.length).split('.')[0]);
    if(scoped.startsWith('appearance.variants.'))return COMPONENT_VARIANTS.includes(scoped.slice('appearance.variants.'.length));
    if(scoped.startsWith('effects.'))return EFFECT_KEYS.includes(scoped.slice('effects.'.length));
    return false;
  }
  function projectMaterialValue(key,value,platform='web'){
    if(platform!=='native')return value;
    const s=String(value??'').trim();
    if(MATERIAL_BLUR_KEYS.has(key)){const m=s.match(/^(-?[\d.]+)px$/i);return m?Number(m[1]):value;}
    if(OPACITY_KEYS.has(key)){const m=s.match(/^(-?[\d.]+)%$/);return m?Number(m[1])/100:value;}
    if(key==='materialSaturation'){const n=Number(s);return Number.isFinite(n)?n:value;}
    return value;
  }
  function projectTokenMap(values={},platform='web'){const out={};for(const [key,value] of Object.entries(values||{}))out[key]=projectMaterialValue(key,value,platform);return Object.freeze(out);}
  function projectMaterial(material={},platform='web'){
    const base=projectTokenMap(material.base,platform),roles={},contexts={},roleContexts={};
    for(const [role,values] of Object.entries(material.roles||{}))roles[role]=projectTokenMap(values,platform);
    for(const [context,values] of Object.entries(material.contexts||{}))contexts[context]=projectTokenMap(values,platform);
    for(const [role,rows] of Object.entries(material.roleContexts||{})){const out={};for(const [context,values] of Object.entries(rows||{}))out[context]=projectTokenMap(values,platform);roleContexts[role]=Object.freeze(out);}
    return Object.freeze({base,roles:Object.freeze(roles),contexts:Object.freeze(contexts),roleContexts:Object.freeze(roleContexts)});
  }
  function resolveMaterialContext(material={},role='',context=''){return Object.freeze({...material.base,...(material.roles?.[role]||{}),...(material.contexts?.[context]||{}),...(material.roleContexts?.[role]?.[context]||{})});}
  function resolveComponentAppearance(appearance={},component='',options={}){
    const row=appearance?.components?.[component]||{},role=String(options.role||''),context=String(options.context||''),variant=String(options.variant||'');let out={};
    const add=source=>{if(!source)return;for(const key of COMPONENT_APPEARANCE_KEYS)if(source[key]!==undefined)out[key]=source[key];};
    add(row);add(row.roles?.[role]);if(variant){add(row.variants?.[variant]);add(row.roles?.[role]?.variants?.[variant]);}add(row.contexts?.[context]);if(variant)add(row.contexts?.[context]?.variants?.[variant]);add(row.roles?.[role]?.contexts?.[context]);if(variant)add(row.roles?.[role]?.contexts?.[context]?.variants?.[variant]);return Object.freeze(out);
  }
  return Object.freeze({version:VERSION,minimumCompatibleContractVersion:MIN_COMPATIBLE_CONTRACT_VERSION,appearanceKeys:()=>APPEARANCE_KEYS.slice(),roleAppearanceKeys:()=>ROLE_APPEARANCE_KEYS.slice(),componentAppearanceKeys:()=>COMPONENT_APPEARANCE_KEYS.slice(),componentAppearanceComponents:()=>COMPONENT_APPEARANCE_COMPONENTS.slice(),componentVariants:()=>COMPONENT_VARIANTS.slice(),componentVariantMap:()=>Object.freeze(Object.fromEntries(Object.entries(COMPONENT_VARIANT_MAP).map(([k,v])=>[k,v.slice()]))),effectKeys:()=>EFFECT_KEYS.slice(),scientificKeys:()=>SCIENTIFIC_KEYS.slice(),motionKeys:()=>MOTION_KEYS.slice(),materialKeys:()=>MATERIAL_KEYS.slice(),tokenKeys:()=>TOKEN_KEYS.slice(),materialRoles:()=>MATERIAL_ROLES.slice(),materialRecipes:()=>MATERIAL_RECIPES.slice(),materialContexts:()=>MATERIAL_CONTEXTS.slice(),componentContexts:()=>COMPONENT_CONTEXTS.slice(),parseToken,validateProfile,resolveProfile,projectMaterial,resolveMaterialContext,resolveComponentAppearance,supports,platformUnits:Object.freeze({length:'logical-unit: web 1 unit = 1 CSS px; Android 1 unit = 1 dp before native blur/material projection',duration:'milliseconds',opacity:'0..1 canonical',saturation:'multiplier 0..3',scale:'unitless 0.8..1.2'})});
});
