'use strict';

(function init(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DKDSPlatformPresentationContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const VERSION='1.1.0';
  const PLATFORMS=Object.freeze(['desktop','mobile']);
  const MODES=Object.freeze(['shared','adaptive','custom']);
  const MODE_SET=new Set(MODES);

  const stringList=value=>Array.isArray(value)?value.map(row=>String(row||'').trim()).filter(Boolean):[];
  const unique=value=>[...new Set(value)];
  const normalizePlatform=platform=>String(platform||'').trim().toLowerCase()==='mobile'?'mobile':'desktop';

  function uiOwning(manifest={}){
    if(String(manifest?.pluginType||'').trim().toLowerCase()==='theme')return false;
    if(stringList(manifest?.styles).length)return true;
    if(manifest?.workspace||manifest?.window)return true;
    if(stringList(manifest?.requiresCore).some(row=>row.startsWith('ui.')))return true;
    return stringList(manifest?.capabilities).some(row=>row.startsWith('ui.'));
  }

  function policyFor(manifest={},platform='desktop'){
    const key=normalizePlatform(platform),root=manifest?.platformPresentation;
    const row=root&&typeof root==='object'&&!Array.isArray(root)?root[key]:null;
    if(!row||typeof row!=='object'||Array.isArray(row)){
      if(uiOwning(manifest))throw new Error(`UI-owning plugin ${manifest?.id||'(unknown)'} must declare platformPresentation.${key}.`);
      return Object.freeze({mode:'shared',styles:Object.freeze([]),scripts:Object.freeze([]),explicit:false});
    }
    const mode=MODE_SET.has(String(row.mode||'').trim().toLowerCase())?String(row.mode).trim().toLowerCase():'shared';
    return Object.freeze({mode,styles:Object.freeze(unique(stringList(row.styles))),scripts:Object.freeze(unique(stringList(row.scripts))),explicit:true});
  }

  function assetsFor(manifest={},platform='desktop'){
    const selected=policyFor(manifest,platform);
    return Object.freeze({
      platform:normalizePlatform(platform),
      mode:selected.mode,
      sharedStyles:Object.freeze(unique(stringList(manifest?.styles))),
      sharedScripts:Object.freeze(unique(stringList(manifest?.scripts))),
      platformStyles:selected.mode==='custom'?selected.styles:Object.freeze([]),
      platformScripts:selected.mode==='custom'?selected.scripts:Object.freeze([]),
      explicit:selected.explicit
    });
  }

  function referencedPlatformAssets(manifest={}){
    const out=[];
    for(const platform of PLATFORMS){
      const policy=policyFor(manifest,platform);
      for(const file of [...policy.styles,...policy.scripts])if(!out.includes(file))out.push(file);
    }
    return Object.freeze(out);
  }

  function validate(manifest={}){
    const errors=[];
    const root=manifest?.platformPresentation;
    const hasRoot=root!==undefined;
    if(hasRoot&&(!root||typeof root!=='object'||Array.isArray(root))){
      errors.push('platformPresentation must be an object.');
      return Object.freeze({ok:false,errors:Object.freeze(errors),uiOwning:uiOwning(manifest)});
    }
    const ownsUi=uiOwning(manifest);
    if(ownsUi&&!hasRoot)errors.push('UI-owning plugins must explicitly declare platformPresentation.desktop and platformPresentation.mobile.');
    if(hasRoot){
      for(const platform of PLATFORMS){
        const row=root[platform];
        if(!row||typeof row!=='object'||Array.isArray(row)){
          errors.push(`platformPresentation.${platform} is required and must be an object.`);
          continue;
        }
        const mode=String(row.mode||'').trim().toLowerCase();
        if(!MODE_SET.has(mode))errors.push(`platformPresentation.${platform}.mode must be one of ${MODES.join(', ')}.`);
        const styles=stringList(row.styles),scripts=stringList(row.scripts);
        if(row.styles!==undefined&&!Array.isArray(row.styles))errors.push(`platformPresentation.${platform}.styles must be an array.`);
        if(row.scripts!==undefined&&!Array.isArray(row.scripts))errors.push(`platformPresentation.${platform}.scripts must be an array.`);
        if(styles.length!==new Set(styles).size)errors.push(`platformPresentation.${platform}.styles must contain unique files.`);
        if(scripts.length!==new Set(scripts).size)errors.push(`platformPresentation.${platform}.scripts must contain unique files.`);
        for(const file of styles)if(!/\.css$/i.test(file))errors.push(`platformPresentation.${platform}.styles must contain CSS files: ${file}`);
        for(const file of scripts)if(!/\.js$/i.test(file))errors.push(`platformPresentation.${platform}.scripts must contain JavaScript files: ${file}`);
        if(mode==='custom'&&!styles.length&&!scripts.length)errors.push(`platformPresentation.${platform} mode=custom requires at least one platform style or script.`);
        if((mode==='shared'||mode==='adaptive')&&(styles.length||scripts.length))errors.push(`platformPresentation.${platform} mode=${mode} must not declare platform-specific styles or scripts.`);
        const sharedStyles=new Set(stringList(manifest?.styles)),sharedScripts=new Set(stringList(manifest?.scripts));
        for(const file of styles)if(sharedStyles.has(file))errors.push(`platformPresentation.${platform} style is already shared through manifest.styles: ${file}`);
        for(const file of scripts){
          if(sharedScripts.has(file))errors.push(`platformPresentation.${platform} script is already shared through manifest.scripts: ${file}`);
          if(String(manifest?.entry||'')===file)errors.push(`platformPresentation.${platform}.scripts must not repeat the plugin entry: ${file}`);
        }
      }
      if(root.desktop&&root.mobile){
        const desktopStyles=new Set(stringList(root.desktop.styles)),mobileStyles=new Set(stringList(root.mobile.styles));
        const desktopScripts=new Set(stringList(root.desktop.scripts)),mobileScripts=new Set(stringList(root.mobile.scripts));
        for(const file of desktopStyles)if(mobileStyles.has(file))errors.push(`Platform style is declared for both desktop and mobile; move it to manifest.styles: ${file}`);
        for(const file of desktopScripts)if(mobileScripts.has(file))errors.push(`Platform script is declared for both desktop and mobile; move it to manifest.scripts: ${file}`);
      }
    }
    return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors),uiOwning:ownsUi});
  }

  return Object.freeze({version:VERSION,platforms:PLATFORMS,modes:MODES,normalizePlatform,uiOwning,policyFor,assetsFor,referencedPlatformAssets,validate});
});
