(() => {
  'use strict';
  const VERSION='3.6.0';
  const STRONG_ROLES=new Set(['elevated','popover','floating']);
  const MATERIAL_RECIPES=Object.freeze(['clear','thin-glass','soft-glass','liquid-glass']);
  const recipePolicy=()=>Object.freeze({...(globalThis.DKDSTheme?.recipePolicy?.()||{})});
  const LIQUID_ROLES=new Set(['popover','floating']);
  const recipeOf=el=>{const role=roleOf(el);if(!role)return '';const explicit=String(el?.dataset?.dkdsMaterialRecipe||'').trim();if(explicit)return explicit;return String(recipePolicy()[role]||'').trim();};
  const roleOf=el=>String(getComputedStyle(el).getPropertyValue('--dkds-material-role')||'').trim().replace(/["']/g,'');
  const prop=(style,name)=>String(style?.getPropertyValue?.(name)||'').trim();
  const backdropOf=style=>String(style?.backdropFilter||style?.webkitBackdropFilter||prop(style,'backdrop-filter')||prop(style,'-webkit-backdrop-filter')||'').trim();
  const px=value=>{const m=String(value||'').match(/(-?[\d.]+)px/i);return m?Number(m[1]):0;};
  const ROLE_CLASS_PREFIX='dkds-material-role-';
  const POPOVER_SEMANTIC_SELECTOR='.command-menu,.dkds-context-menu,.dkds-tooltip,.dkds-core-tooltip,.dkds-d3-chart-tooltip,.hover-tip,.activity-more-menu,.context-overflow-menu,.range-action-menu,[role="menu"],[data-dkds-popover]';
  const ROLE_BINDINGS=Object.freeze([
    ['floating','.dkds-floating-surface,.floating-panel,.dkds-prime-floating,.dkds-memory-panel,.dkds-scientific-nav-tools,.zoom-panel,.dkds-portable-view.is-floating,.dkds-portable-view.is-global-floating'],
    ['popover',POPOVER_SEMANTIC_SELECTOR],
    ['elevated','#pluginManagerPage,#automationTestPage,.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench,.project-save-choice-card,.dkds-theme-settings-dialog'],
    ['chrome','.topbar,.project-tabs-bar,#statusBar.statusbar,.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.dkds-plot-view-head,.dkds-group-plot-head'],
    ['sidebar','.left-panel,.plugin-sidebar-sections,.dkds-plugin-canvas-left,.dkds-plugin-canvas-right,.dkds-analysis-left,.dkds-analysis-right'],
    ['surface','.analysis-page:not(#pluginManagerPage):not(#automationTestPage),.dkds-ui-workspace,.dkds-plugin-workspace,.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-plugin-canvas-center,.dkds-plugin-canvas-bottom,.dkds-analysis-primary-host,.dkds-plugin-sub-page-host,.dkds-surface,.dkds-chart-surface,.dkds-table-surface-host,.dkds-scientific-surface-host,.dkds-portable-view:not(.is-floating):not(.is-global-floating)'],
    ['control','button,input,select,textarea,.dkds-field-control,.dkds-icon-button,.dkds-action-button,.toolbar-btn,.plugin-toolbar-btn,.project-tab-close,.dkds-choice-button,.dkds-dialog-action']
  ]);
  const ROLE_CLASSES=Object.freeze((globalThis.DKDSThemeContract?.materialRoles?.()||[]).map(role=>`${ROLE_CLASS_PREFIX}${role}`));
  function explicitRole(el){const owner=String(el?.dataset?.dkdsMaterialRoleClassOwner||'');return ROLE_CLASSES.find(cls=>el?.classList?.contains(cls)&&owner!=='core-runtime')||'';}
  const INTEGRATED_CONTAINER_SELECTOR='.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions,.statusbar-command-cluster,.toolbar-group,.primary-activity-cluster,.system-core-tools-group,[data-dkds-material-integrated="true"]';
  const INTEGRATED_CHILD_SELECTOR='.dkds-integrated-action-group button,.panel-header-actions button,.trend-header-actions button,.dkds-plot-view-actions button,.statusbar-command-cluster button,.toolbar-group button,.primary-activity-cluster button,.system-core-tools-group button,[data-dkds-material-integrated="true"] button,.dkds-scientific-nav-tools button';
  const CHROME_SEMANTIC_SELECTOR='[data-dkds-material-role="chrome"],.dkds-material-role-chrome,.topbar,.project-tabs-bar,#statusBar.statusbar,.analysis-page-header,.dkds-analysis-header,.plugin-manager-header,.dkds-surface-header,.floating-header,.trend-card-header,.dkds-plot-view-head,.dkds-group-plot-head';
  const SEMANTIC_CONTROL_PAINT_SELECTOR='.toolbar-btn,.activity-tab,.plugin-toolbar-btn,.primary,.strong,.danger-soft,.accent-soft,.selected,.active,[aria-pressed="true"],[aria-selected="true"],[aria-checked="true"],[data-state="active"],[data-selected="true"]';
  const semanticControlOwnsPaint=el=>!!el?.matches?.(SEMANTIC_CONTROL_PAINT_SELECTOR);
  function chromeOwnedIntegrated(el){
    if(el?.matches?.(POPOVER_SEMANTIC_SELECTOR))return false;
    if(!el?.closest?.(CHROME_SEMANTIC_SELECTOR))return false;
    if(el.matches?.(INTEGRATED_CONTAINER_SELECTOR))return true;
    return !!el.closest?.(INTEGRATED_CONTAINER_SELECTOR);
  }
  const TRANSLUCENT_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass']);
  const MATERIAL_OWNER_SELECTOR='[data-dkds-material-role="elevated"],.dkds-material-role-elevated,[data-dkds-material-role="floating"],.dkds-material-role-floating';
  function parentMaterialRole(el){
    const parent=el?.parentElement;if(!parent?.matches?.(MATERIAL_OWNER_SELECTOR))return '';
    if(parent.matches?.('[data-dkds-material-role="elevated"],.dkds-material-role-elevated'))return 'elevated';
    if(parent.matches?.('[data-dkds-material-role="floating"],.dkds-material-role-floating'))return 'floating';
    return '';
  }
  function nestedParentOwnsBackdrop(el){
    if(!el?.matches?.('.dkds-surface-header,.floating-header'))return false;
    const role=parentMaterialRole(el);
    return !!role&&TRANSLUCENT_RECIPES.has(String(recipePolicy()[role]||''));
  }
  function inferRole(el){if(el?.matches?.('.dkds-portable-view'))return el.matches('.is-floating,.is-global-floating')?'floating':'surface';if(chromeOwnedIntegrated(el))return '';if(nestedParentOwnsBackdrop(el))return '';for(const [role,selector] of ROLE_BINDINGS){try{if(el.matches?.(selector)){if(role==='control'&&semanticControlOwnsPaint(el))return '';return role;}}catch{}}return '';}
  function inferRecipe(el,role){
    if(!role)return '';
    if(role==='control'&&el.matches?.(INTEGRATED_CHILD_SELECTOR))return '';
    return recipePolicy()[role]||'';
  }
  const hasClass=(el,cls)=>!!el?.classList?.contains?.(cls);
  const addClass=(el,cls)=>{if(!hasClass(el,cls)){el.classList.add(cls);return true;}return false;};
  const removeClass=(el,cls)=>{if(hasClass(el,cls)){el.classList.remove(cls);return true;}return false;};
  const setData=(el,key,value)=>{const next=String(value??'');if(String(el?.dataset?.[key]??'')!==next)el.dataset[key]=next;};
  function ownership(el,expectedRole=''){
    const expected=String(expectedRole||''),actual=roleOf(el);
    if(expected==='control'&&semanticControlOwnsPaint(el))return Object.freeze({managed:true,status:'MATERIAL_SEMANTIC_OVERRIDE',role:actual||'semantic-control',expectedRole:expected});
    if(expected==='control'&&el?.matches?.(INTEGRATED_CHILD_SELECTOR))return Object.freeze({managed:true,status:'MATERIAL_CHROME_OWNED',role:actual||'integrated-hit-region',expectedRole:expected});
    if(expected==='control'&&chromeOwnedIntegrated(el))return Object.freeze({managed:true,status:'MATERIAL_CHROME_OWNED',role:actual||'chrome-owned-control',expectedRole:expected});
    if(expected==='chrome'&&nestedParentOwnsBackdrop(el))return Object.freeze({managed:true,status:'MATERIAL_PARENT_OWNED',role:actual||'parent-owned-chrome',expectedRole:expected});
    return Object.freeze({managed:!!actual&&(!expected||actual===expected),status:actual&&(!expected||actual===expected)?'MATERIAL_ROLE_OWNED':'ROLE_MISSING',role:actual,expectedRole:expected});
  }
  function assignSemanticRole(el){
    if(!el?.classList)return '';
    // Chrome owns integrated command hit regions. Remove invalid nested control
    // material unless a caller explicitly opts into an independent surface.
    if(chromeOwnedIntegrated(el)&&el.dataset.dkdsMaterialOwnSurface!=='true'&&el.classList.contains('dkds-material-role-control')){
      el.classList.remove('dkds-material-role-control');
      if(el.dataset.dkdsMaterialRoleClassOwner==='core-runtime')delete el.dataset.dkdsMaterialRoleClassOwner;
      if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;}
      if(el.dataset.dkdsMaterialAssignedRole==='control'){delete el.dataset.dkdsMaterialAssigned;delete el.dataset.dkdsMaterialAssignedRole;delete el.dataset.dkdsMaterialRole;}
    }
    const roleClassOwner=String(el.dataset.dkdsMaterialRoleClassOwner||'');
    const explicit=explicitRole(el),role=explicit?explicit.slice(ROLE_CLASS_PREFIX.length):inferRole(el),previous=String(el.dataset.dkdsMaterialAssignedRole||'');
    if(previous&&previous!==role&&roleClassOwner==='core-runtime')removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`);
    if(role){
      if(!explicit){
        addClass(el,`${ROLE_CLASS_PREFIX}${role}`);
        setData(el,'dkdsMaterialRoleClassOwner','core-runtime');
      }
      setData(el,'dkdsMaterialAssigned','core-runtime');setData(el,'dkdsMaterialAssignedRole',role);setData(el,'dkdsMaterialRole',role);
      const recipe=inferRecipe(el,role);
      if(recipe){
        setData(el,'dkdsMaterialRecipe',recipe);setData(el,'dkdsMaterialRecipeOwner','core-runtime');
        try{
          if(recipe==='liquid-glass'){
            if(!hasClass(el,'dkds-optical-position-anchor')&&getComputedStyle(el).position==='static')addClass(el,'dkds-optical-position-anchor');
          }else removeClass(el,'dkds-optical-position-anchor');
        }catch{}
      }
      else if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){
        delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;removeClass(el,'dkds-optical-position-anchor');
      }
    }
    else if(previous){
      if(roleClassOwner==='core-runtime')removeClass(el,`${ROLE_CLASS_PREFIX}${previous}`);
      delete el.dataset.dkdsMaterialAssigned;delete el.dataset.dkdsMaterialAssignedRole;delete el.dataset.dkdsMaterialRole;
      if(roleClassOwner==='core-runtime')delete el.dataset.dkdsMaterialRoleClassOwner;
      if(el.dataset.dkdsMaterialRecipeOwner==='core-runtime'){delete el.dataset.dkdsMaterialRecipe;delete el.dataset.dkdsMaterialRecipeOwner;removeClass(el,'dkds-optical-position-anchor');}
    }
    return role;
  }
  function assignSemanticRoles(root=document){
    if(!root?.querySelectorAll)return Object.freeze({assigned:0});
    const nodes=new Set();for(const [,selector] of ROLE_BINDINGS){try{for(const el of root.querySelectorAll(selector))nodes.add(el);}catch{}}
    // Explicit MaterialSurface classes and integrated command containers are
    // semantic inputs too; they must participate in the initial full scan, not
    // only when a later MutationObserver happens to touch them.
    try{for(const el of root.querySelectorAll(ROLE_CLASSES.map(cls=>`.${cls}`).join(',')))nodes.add(el);}catch{}
    try{for(const el of root.querySelectorAll(INTEGRATED_CONTAINER_SELECTOR))nodes.add(el);}catch{}
    if(root.nodeType===1)nodes.add(root);
    let assigned=0;for(const el of nodes)if(assignSemanticRole(el))assigned++;
    return Object.freeze({assigned});
  }
  const pendingRoleRoots=new Set();
  let roleFrame=0,assignmentEnabled=false;
  const requestFrame=fn=>(globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,0)))(fn);
  function flushRoleAssignments(){
    roleFrame=0;
    if(!assignmentEnabled||!pendingRoleRoots.size)return;
    const roots=[...pendingRoleRoots];pendingRoleRoots.clear();
    for(const root of roots)assignSemanticRoles(root);
  }
  function scheduleRoleAssignment(root=document){
    if(root?.querySelectorAll)pendingRoleRoots.add(root);
    if(!assignmentEnabled||roleFrame)return;
    roleFrame=requestFrame(flushRoleAssignments);
  }
  function enableAssignmentsAfterFirstPaint(){
    requestFrame(()=>requestFrame(()=>{
      assignmentEnabled=true;
      scheduleRoleAssignment(document);
      refreshDerivedContrast();
    }));
  }

  function applyMaterialSurface(el,role){
    if(!el?.classList)throw new Error('MaterialSurface requires a DOM element.');
    const normalized=String(role||'').trim();
    if(!ROLE_CLASSES.includes(`${ROLE_CLASS_PREFIX}${normalized}`))throw new Error(`Unknown Material Role: ${normalized||'(empty)'}`);
    for(const cls of ROLE_CLASSES)el.classList.remove(cls);
    el.classList.add(`${ROLE_CLASS_PREFIX}${normalized}`);
    el.dataset.dkdsMaterialSurface='core';
    el.dataset.dkdsMaterialRoleClassOwner='material-surface';
    delete el.dataset.dkdsMaterialAssigned;
    delete el.dataset.dkdsMaterialAssignedRole;
    assignSemanticRole(el);
    return el;
  }
  function createMaterialSurface(role,{tag='div',className='',attributes={}}={}){
    const el=document.createElement(String(tag||'div'));
    if(className)el.className=String(className);
    for(const [key,value] of Object.entries(attributes||{})){if(value!==undefined&&value!==null)el.setAttribute(key,String(value));}
    return applyMaterialSurface(el,role);
  }

  const parseRgb=value=>{const m=String(value||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)/i);if(!m)return null;let a=m[4]==null?1:Number(m[4]);if(String(m[4]||'').includes('%'))a/=100;return {r:Number(m[1]),g:Number(m[2]),b:Number(m[3]),a:Number.isFinite(a)?a:1};};
  const mix=(fg,bg)=>{const a=Math.max(0,Math.min(1,fg?.a??1));return {r:(fg.r*a)+(bg.r*(1-a)),g:(fg.g*a)+(bg.g*(1-a)),b:(fg.b*a)+(bg.b*(1-a)),a:1};};
  const lum=c=>{const f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  function resolveCssColor(expression,property='color'){
    if(!document?.body)return null;const el=document.createElement('span');el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;pointer-events:none';el.style[property]=expression;document.body.appendChild(el);try{return parseRgb(getComputedStyle(el)[property]);}finally{el.remove();}
  }
  function refreshDerivedContrast(){
    if(!document?.body)return Object.freeze({ready:false});
    const canvas=resolveCssColor('var(--dkui-canvas)','backgroundColor')||{r:255,g:255,b:255,a:1};
    const probe=document.createElement('div');probe.className='dkds-material-role-popover';probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;left:-10000px;top:-10000px;width:8px;height:8px;pointer-events:none';document.body.appendChild(probe);
    let base0=null;try{base0=parseRgb(getComputedStyle(probe).backgroundColor);}finally{probe.remove();}
    base0=base0||resolveCssColor('var(--dkui-surface-elevated)','backgroundColor')||canvas;const base=mix(base0,canvas);
    const semantic=resolveCssColor('var(--dkui-text)','color');
    const dark={r:17,g:24,b:39,a:1},light={r:248,g:250,b:252,a:1};
    const semanticRatio=semantic?contrast(semantic,base):0,darkRatio=contrast(dark,base),lightRatio=contrast(light,base);
    const chosen=semanticRatio>=4.5?semantic:(darkRatio>=lightRatio?dark:light),ratio=contrast(chosen,base);
    const css=`rgb(${Math.round(chosen.r)} ${Math.round(chosen.g)} ${Math.round(chosen.b)})`;
    document.documentElement.style.setProperty('--dkds-on-popover',css);
    document.documentElement.style.setProperty('--dkds-popover-contrast-ratio',ratio.toFixed(2));
    return Object.freeze({ready:true,color:css,contrastRatio:ratio});
  }
  function alphaOf(value){
    const s=String(value||'').trim();if(!s||s==='transparent')return 0;
    let m=s.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/i);if(m)return Number(m[1]);
    m=s.match(/^rgb\([^/]+\/\s*([\d.]+)%?\s*\)$/i);if(m){const n=Number(m[1]);return s.includes('%')?n/100:n;}
    return /^rgb\(/i.test(s)?1:null;
  }
  let opticalFrame=0,opticalPending=null,opticalActive=null,opticalIdleTimer=0;
  const reduceMotion=()=>{try{return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;}catch{return false;}};
  function resetOptical(el){if(!el?.style)return;el.classList?.remove?.('dkds-optical-active');el.style.setProperty('--dkds-optical-x','50%');el.style.setProperty('--dkds-optical-y','18%');el.style.setProperty('--dkds-optical-shift-x','0px');el.style.setProperty('--dkds-optical-shift-y','0px');}
  function applyOpticalPointer(el,event){
    if(!el?.isConnected||recipeOf(el)!=='liquid-glass'||reduceMotion()){resetOptical(el);return;}
    const rect=el.getBoundingClientRect?.();if(!rect||rect.width<=0||rect.height<=0)return;el.classList?.add?.('dkds-optical-active');clearTimeout(opticalIdleTimer);opticalIdleTimer=setTimeout(()=>el.classList?.remove?.('dkds-optical-active'),180);
    const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    const sx=(x-.5)*1.6,sy=(y-.5)*1.2;
    el.style.setProperty('--dkds-optical-x',`${(x*100).toFixed(2)}%`);el.style.setProperty('--dkds-optical-y',`${(y*100).toFixed(2)}%`);el.style.setProperty('--dkds-optical-shift-x',`${sx.toFixed(3)}px`);el.style.setProperty('--dkds-optical-shift-y',`${sy.toFixed(3)}px`);
  }
  function scheduleOpticalPointer(el,event){opticalPending={el,event};if(opticalFrame)return;const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));opticalFrame=raf(()=>{opticalFrame=0;const row=opticalPending;opticalPending=null;if(!row)return;if(opticalActive&&opticalActive!==row.el)resetOptical(opticalActive);opticalActive=row.el;applyOpticalPointer(row.el,row.event);});}
  function setupOpticalPointerResponse(){
    if(!document?.addEventListener)return Object.freeze({ready:false});
    document.addEventListener('pointermove',event=>{const el=event.target?.closest?.('[data-dkds-material-recipe="liquid-glass"]');if(el)scheduleOpticalPointer(el,event);else if(opticalActive){resetOptical(opticalActive);opticalActive=null;}},{passive:true});
    globalThis.addEventListener?.('blur',()=>{if(opticalActive){resetOptical(opticalActive);opticalActive=null;}});
    return Object.freeze({ready:true});
  }
  function engineCapabilities(){
    const css=globalThis.CSS;
    const supports=(name,value)=>{try{return !!css?.supports?.(name,value);}catch{return false;}};
    const standard=supports('backdrop-filter','blur(1px)'),webkit=supports('-webkit-backdrop-filter','blur(1px)');
    return Object.freeze({backdropFilter:standard,webkitBackdropFilter:webkit,colorMix:supports('color','color-mix(in srgb, red 50%, blue)'),radialGradient:supports('background-image','radial-gradient(circle, red, transparent)'),maskImage:supports('mask-image','radial-gradient(circle, transparent, black)')||supports('-webkit-mask-image','radial-gradient(circle, transparent, black)'),pointerEvents:'PointerEvent' in globalThis});
  }
  function recipeInstalled(){
    try{return prop(getComputedStyle(document.documentElement),'--dkds-material-renderer-version').replace(/["']/g,'')===VERSION;}catch{return false;}
  }
  function opaqueParentOf(el){
    let node=el?.parentElement||null,depth=0;
    while(node&&node!==document.body&&node!==document.documentElement&&depth<8){
      const style=getComputedStyle(node),alpha=alphaOf(style.backgroundColor);
      if(alpha!==null&&alpha>=.985){return Object.freeze({tag:String(node.tagName||'').toLowerCase(),id:String(node.id||''),className:String(node.className||''),backgroundColor:String(style.backgroundColor||''),alpha});}
      node=node.parentElement;depth++;
    }
    return null;
  }

  function inspect(el,expectedRole=''){
    if(!el||typeof getComputedStyle!=='function')return Object.freeze({status:'NO_ELEMENT',role:'',expectedRole,recipe:'clear'});
    const style=getComputedStyle(el),role=roleOf(el),recipe=recipeOf(el),engine=engineCapabilities(),backdropFilter=backdropOf(style);
    const expectedBlur=prop(style,'--dkds-material-blur'),expectedBlurStrong=prop(style,'--dkds-material-blur-strong'),expectedSaturation=prop(style,'--dkds-material-saturation');
    const backgroundColor=String(style.backgroundColor||'').trim(),backgroundAlpha=alphaOf(backgroundColor),foregroundColor=String(style.color||'').trim();
    let contrastRatio=null;
    if(role==='popover'){
      const fg=parseRgb(foregroundColor),bg0=parseRgb(backgroundColor),canvas=resolveCssColor('var(--dkui-canvas)','backgroundColor')||{r:255,g:255,b:255,a:1};
      if(fg&&bg0){const bg=mix(bg0,canvas);contrastRatio=contrast(fg,bg);}
    }
    let edgeBackdropFilter='',edgeTransform='',specularBackground='';
    if(recipe==='liquid-glass'){
      try{const edge=getComputedStyle(el,'::before'),specular=getComputedStyle(el,'::after');edgeBackdropFilter=backdropOf(edge);edgeTransform=String(edge.transform||'').trim();specularBackground=String(specular.backgroundImage||'').trim();}catch{}
    }
    const opaqueParent=recipe&&recipe!=='clear'?opaqueParentOf(el):null;
    let status='REAL_MATERIAL',opticalStatus=recipe==='clear'?'CLEAR_MATERIAL':recipe==='thin-glass'?'THIN_GLASS':recipe==='soft-glass'?'SOFT_GLASS':'LIQUID_GLASS';
    if(expectedRole&&role!==expectedRole)status='ROLE_MISSING';
    else if(!role)status='ROLE_MISSING';
    else if(!recipe||!MATERIAL_RECIPES.includes(recipe))status='RECIPE_MISSING';
    else if(!recipeInstalled())status='BROKEN_MATERIAL_RENDERER';
    else if(el.matches?.('.primary,.strong,[data-dkds-material-opaque="true"]'))status='MATERIAL_SEMANTIC_OVERRIDE';
    else if(recipe!=='clear'&&!engine.backdropFilter&&!engine.webkitBackdropFilter)status='ENGINE_UNSUPPORTED';
    else if((recipe==='thin-glass'||recipe==='soft-glass')&&px(prop(style,'--dkds-material-blur'))>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(backdropFilter))status='BACKDROP_FILTER_NONE';
    else if(recipe==='liquid-glass'){
      const baseBlur=prop(style,'--dkds-material-blur'),edgeBlur=prop(style,'--dkds-material-blur-strong');
      if(px(baseBlur)>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(backdropFilter))status='BROKEN_MATERIAL_RENDERER';
      else if(px(edgeBlur)>0&&!/blur\(\s*(?!0(?:px)?\b)[^)]+\)/i.test(edgeBackdropFilter)){status='BROKEN_OPTICAL_RENDERER';opticalStatus='BROKEN_EDGE_REFRACTION';}
      else if(!specularBackground||specularBackground==='none'){status='BROKEN_OPTICAL_RENDERER';opticalStatus='BROKEN_SPECULAR';}
      else opticalStatus='REAL_LIQUID_MATERIAL';
    }
    else if(recipe==='clear')opticalStatus='REAL_CLEAR_MATERIAL';
    else if(recipe==='thin-glass')opticalStatus='REAL_THIN_GLASS';
    else opticalStatus='REAL_SOFT_MATERIAL';
    if(status==='REAL_MATERIAL'&&recipe!=='clear'&&backgroundAlpha!==null&&backgroundAlpha>=.985)status='OPAQUE_PARENT_OCCLUSION';
    if(status==='REAL_MATERIAL'&&recipe!=='clear'&&opaqueParent)status='OPAQUE_PARENT_OCCLUSION';
    if(status==='REAL_MATERIAL'&&role==='popover'&&Number.isFinite(contrastRatio)&&contrastRatio<4.5)status='LOW_CONTRAST_MATERIAL';
    return Object.freeze({status,opticalStatus,role,expectedRole,recipe,expectedBlur,expectedBlurStrong,expectedSaturation,backdropFilter,edgeBackdropFilter,edgeTransform,specularBackground,backgroundColor,backgroundAlpha,foregroundColor,contrastRatio,opaqueParent,recipeInstalled:recipeInstalled(),engine});
  }
  function probeRole(role){
    if(!document?.body)return Object.freeze({role,status:'NO_BODY'});
    const el=document.createElement('div');el.className=`dkds-material-role-${role}`;el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;width:20px;height:20px;pointer-events:none';document.body.appendChild(el);assignSemanticRole(el);
    try{return inspect(el,role);}finally{el.remove();}
  }
  function probeRecipe(recipe,role=recipe==='liquid-glass'?'popover':recipe==='thin-glass'?'popover':recipe==='soft-glass'?'sidebar':'surface'){
    if(!document?.body)return Object.freeze({recipe,status:'NO_BODY'});const el=document.createElement('div');el.className=`dkds-material-role-${role}`;el.dataset.dkdsMaterialRecipe=recipe;el.dataset.dkdsMaterialRecipeOwner='capability-probe';el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:-10000px;top:-10000px;width:20px;height:20px;pointer-events:none';document.body.appendChild(el);try{return inspect(el,role);}finally{el.remove();}
  }
  function capabilities(){
    const engine=engineCapabilities(),installed=recipeInstalled(),roles={};
    for(const role of (window.DKDSThemeContract?.materialRoles?.()||[])){const row=probeRole(role);roles[role]=!['BROKEN_MATERIAL_RENDERER','BROKEN_OPTICAL_RENDERER','MISSING_MATERIAL_ROLE','ENGINE_UNSUPPORTED'].includes(row.status);}
    const thinProbe=probeRecipe('thin-glass','popover'),softProbe=probeRecipe('soft-glass','sidebar'),liquidProbe=probeRecipe('liquid-glass','popover');
    const recipes={clear:true,'thin-glass':thinProbe.status==='REAL_MATERIAL','soft-glass':softProbe.status==='REAL_MATERIAL','liquid-glass':liquidProbe.opticalStatus==='REAL_LIQUID_MATERIAL'};
    const roleReady=Object.values(roles).length>0&&Object.values(roles).every(Boolean),liquidReady=recipes['liquid-glass']===true;
    const assignment=assignSemanticRoles(document),contrastGuard=refreshDerivedContrast();
    return Object.freeze({version:VERSION,engine,recipeInstalled:installed,policy:Object.freeze({roleToRecipe:recipePolicy(),recipes:MATERIAL_RECIPES}),renderer:Object.freeze({backdropBlur:installed&&(engine.backdropFilter||engine.webkitBackdropFilter)&&roleReady,saturation:installed&&(engine.backdropFilter||engine.webkitBackdropFilter)&&roleReady,noise:installed&&engine.radialGradient,glassEdge:installed,innerHighlight:installed,specularHighlight:installed,webMaterial:installed&&roleReady,nativeBlur:false,thinGlass:recipes['thin-glass']===true,semanticRoleAssignment:true,contrastGuard:contrastGuard.ready===true,nonUniformBlur:liquidReady,edgeRefraction:liquidReady&&engine.maskImage,dynamicSpecular:liquidReady&&engine.pointerEvents,liquidGlass:liquidReady}),recipes:Object.freeze(recipes),roles:Object.freeze(roles),assignment,contrastGuard});
  }
  function supports(feature){
    const key=String(feature||'').trim(),caps=capabilities();
    if(key==='renderer.backdropBlur')return caps.renderer.backdropBlur;
    if(key==='renderer.saturation')return caps.renderer.saturation;
    if(key==='renderer.noise')return caps.renderer.noise;
    if(key==='renderer.glassEdge')return caps.renderer.glassEdge;
    if(key==='renderer.innerHighlight')return caps.renderer.innerHighlight;
    if(key==='renderer.specularHighlight')return caps.renderer.specularHighlight;
    if(key==='renderer.webMaterial')return caps.renderer.webMaterial;
    if(key==='renderer.nativeBlur')return caps.renderer.nativeBlur;
    if(key==='renderer.thinGlass')return caps.renderer.thinGlass;
    if(key==='renderer.nonUniformBlur')return caps.renderer.nonUniformBlur;
    if(key==='renderer.edgeRefraction')return caps.renderer.edgeRefraction;
    if(key==='renderer.dynamicSpecular')return caps.renderer.dynamicSpecular;
    if(key==='renderer.liquidGlass')return caps.renderer.liquidGlass;
    if(key==='renderer.profilePolicy')return true;
    if(key.startsWith('renderer.recipes.'))return caps.recipes[key.slice('renderer.recipes.'.length)]===true;
    if(key.startsWith('renderer.roles.'))return caps.roles[key.slice('renderer.roles.'.length)]===true;
    return false;
  }
  const MATERIAL_RUNTIME_CLASS_RE=/^(?:dkds-material-role-|dkds-optical-position-anchor$|dkds-optical-active$)/;
  function semanticClassSignature(value){return String(value||'').split(/\s+/).filter(Boolean).filter(cls=>!MATERIAL_RUNTIME_CLASS_RE.test(cls)).sort().join(' ');}
  function bootAssignments(){
    setupOpticalPointerResponse();
    try{
      const observer=new MutationObserver(records=>{
        for(const record of records){
          if(record.type==='attributes'){
            if(semanticClassSignature(record.oldValue)===semanticClassSignature(record.target?.getAttribute?.('class')))continue;
            scheduleRoleAssignment(record.target);continue;
          }
          for(const node of record.addedNodes||[]){if(node?.nodeType===1)scheduleRoleAssignment(node);}
        }
      });
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
      globalThis.addEventListener?.('beforeunload',()=>observer.disconnect(),{once:true});
    }catch{}
    enableAssignmentsAfterFirstPaint();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAssignments,{once:true});else bootAssignments();
  globalThis.addEventListener?.('dkds:theme-changed',()=>{refreshDerivedContrast();scheduleRoleAssignment(document);});
  globalThis.addEventListener?.('dkds:theme-profile-changed',()=>{refreshDerivedContrast();scheduleRoleAssignment(document);});
  window.DKDSThemeMaterialRenderer=Object.freeze({version:VERSION,capabilities,supports,inspect,ownership,probeRole,probeRecipe,roleOf,recipeOf,assignSemanticRoles,refreshDerivedContrast,materialRecipes:()=>MATERIAL_RECIPES.slice(),materialPolicy:()=>({...recipePolicy()}),materialSurface:Object.freeze({apply:applyMaterialSurface,create:createMaterialSurface})});
  window.DKDSMaterialSurface=Object.freeze({version:'1.0.0',apply:applyMaterialSurface,create:createMaterialSurface,inspect,roleOf,recipeOf});
})();
